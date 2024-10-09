import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { UploadService } from '../../services/upload.service';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen: boolean = false;
  dropdownOpen: boolean = false;
  nickName: string = '';
  public isLogged: boolean = false;
  eventSource: EventSource | undefined;
  uploadId: string | null = null;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private uploadService: UploadService
  ) {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  ngOnInit() {
    this.authService.checkAndRenewToken();
    this.authService.isLoggedIn.subscribe(info => {
      this.isLogged = info.isLogged;
      if (info.isLogged) {
        this.nickName = info.nickName;
      }
    });

    this.uploadService.currentUploadId.subscribe(uploadId => {
      if (uploadId) {
        this.uploadId = uploadId;
        this.initSSE(uploadId);
      }
    });

    initFlowbite();
  }

  initSSE(uploadId: string) {
    if (this.eventSource) {
      this.eventSource.close();
    }
  
    this.eventSource = new EventSource(`http://api.proyecto.local/sse-notify/${uploadId}/`);
  
    this.eventSource.onmessage = (event) => {
      if (event.data !== 'ping') {
        this.showNotification(event.data);
  
        if (event.data.includes('El proceso ha terminado')) {
          this.eventSource?.close();
        }
      }
    };
  
    this.eventSource.onerror = (error) => {
      console.error('Error en la conexión SSE:', error);
  
      if (this.eventSource) {
        this.eventSource.close();
      }
  
      setTimeout(() => {
        console.log('Reintentando conexión SSE...');
        this.initSSE(uploadId);
      }, 5000);
    };
  }
    

  showNotification(message: string) {
    this.toastr.success(message, 'Notificación');
  }

  ngOnDestroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  logout() {
    this.authService.logout();
  }
}
