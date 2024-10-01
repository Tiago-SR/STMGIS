import { Component, Input, OnInit } from '@angular/core';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-modal-forgot-password',
  templateUrl: './modal-forgot-password.component.html',
  styleUrl: './modal-forgot-password.component.scss'
})
export class ModalForgotPasswordComponent {
  forgotEmail = new FormControl('', [Validators.required, Validators.email]); 
  formSubmitted = false;

  constructor(private userService: UsuarioService, private toast: ToastrService) { }

  submit() {
    this.formSubmitted = true;
    if (this.forgotEmail.errors) {
      this.formSubmitted = false;
      if (this.forgotEmail.hasError('required')) this.toast.error('El email es requerido')
      else if (this.forgotEmail.hasError('email')) this.toast.error('El email no es válido')
    }
    const email = this.forgotEmail.value;
    if (this.forgotEmail.valid && email) {
      this.userService.forgotPassword(email).subscribe({
        next: (response) => {
          this.forgotEmail.reset();
          this.formSubmitted = false;
          this.toast.success('Email de recuperación de contraseña enviado');
          const btnCloseModal = document.getElementById('btn-close-modal');
          if (btnCloseModal) btnCloseModal.click();
        },
        error: (error) => {
          if (error.error) {
            if (error.error.detail) this.toast.error(error.error.detail);
            else this.toast.error(error.error);
          } else {
            this.toast.error('Error al enviar el email de recuperación de contraseña');
          }
          this.formSubmitted = false;
        },
      })
    } else {
      this.formSubmitted = false;
    }
  }
}
