import { AfterViewInit, Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-list-user',
  templateUrl: './list-user.component.html',
  styleUrl: './list-user.component.scss'
})
export class ListUserComponent implements AfterViewInit, OnInit {
  users: any[] = []; // Lista de usuarios
  hasError = false;
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  cargando = false;

  constructor(private userService: UsuarioService, private toast: ToastrService) {}

  ngAfterViewInit(): void {
    initFlowbite();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.cargando = true;
    const params = {
      page: this.currentPage,
      page_size: this.pageSize
    };

    this.userService.getUsuariosPaginados().pipe(
      map(data => {
        this.users = data.results;
        this.totalItems = data.count;
        this.cargando = false;
      }),
      catchError(err => {
        console.error('Error getting users', err);
        this.hasError = true;
        this.toast.error('Error getting users');
        this.cargando = false;
        return of([]);
      })
    ).subscribe();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }
}
