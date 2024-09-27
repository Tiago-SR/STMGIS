import { AfterViewInit, Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable, of } from 'rxjs';

@Component({
  selector: 'app-list-user',
  templateUrl: './list-user.component.html',
  styleUrl: './list-user.component.scss'
})
export class ListUserComponent implements AfterViewInit, OnInit {
  userList$: Observable<any> = of ([]);
  hasError = false;
  constructor(private userService: UsuarioService, private toast: ToastrService) { }

  ngAfterViewInit(): void {
    initFlowbite()
  }
  ngOnInit(): void {
    this.userList$ = this.userService.getAllUsers().pipe(
      catchError(err => {
        console.error('Error getting products', err);
        this.hasError = true;
        return of([]);
      })
    );
    this.userList$.subscribe({
      error: () => this.toast.error('Error getting users')
    });

    
  }
}
