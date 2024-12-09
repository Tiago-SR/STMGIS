import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { UploadService } from '../../services/upload.service';
import { initFlowbite } from 'flowbite';
import { UserType } from '../../enums/user-type';
import {CultivoService} from "../../services/cultivo.service";

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
  userType: UserType | null = UserType.RESPONSABLE;
  UserType = UserType;
  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private uploadService: UploadService,
    private cultivoService: CultivoService
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
    this.userType = this.authService.getUserType()
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
        this.initSSE(uploadId);
      }, 5000);
    };
  }
    

  showNotification(message: string) {
    this.toastr.success(message, 'Notificación',
      {
        disableTimeOut: true,
        closeButton: true,
        enableHtml: true
      }
    );
  }

  ngOnDestroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  logout() {
    this.authService.logout();
  }

  resetCacheMapa() {
    this.cultivoService.resetCacheMapa();
  }
}
