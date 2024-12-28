import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-create-modal',
  templateUrl: './user-create-modal.component.html',
  styleUrl: './user-create-modal.component.scss'
})
export class UserCreateModalComponent {
  emailToInvite = new FormControl('', [Validators.required, Validators.email]); 
  formSubmitted = false;
  error: string[] = [];

  constructor(private userService: UsuarioService, private toast: ToastrService) { }

  submit() {
    this.formSubmitted = true;
    this.error = [];
    if (this.emailToInvite.hasError('required')) this.error.push('El email es requerido');
    if (this.emailToInvite.hasError('email')) this.error.push('El email no es válido');
    const email = this.emailToInvite.value;
    if (this.emailToInvite.valid && email) {
      this.userService.inviteUser(email).subscribe({
        next: (response) => {
          this.emailToInvite.reset();
          this.formSubmitted = false;
          this.error = [];
          this.toast.success('Usuario invitado correctamente');
        },
        error: (error) => {
          this.error.push('Error al invitar al usuario');
          this.formSubmitted = false;
        },
      })
    } else {
      this.formSubmitted = false;
    }
  }
}
