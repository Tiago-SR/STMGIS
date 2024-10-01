import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  userData = new FormGroup({
    password: new FormControl('', [
      Validators.required, 
      Validators.minLength(4) 
    ]),
    rePassword: new FormControl('', [
      Validators.required, 
      Validators.minLength(4),
    ])
  });
  formSubmitted = false;
  token = '';
  get password() {
    return this.userData.get('password');
  }
  get rePassword() {
    return this.userData.get('rePassword');
  }

  constructor(private toast: ToastrService, private route: ActivatedRoute, private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token') ?? '';
      if (!this.token) this.router.navigate(['/']);
      this.authService.checkRegisterToken(this.token).subscribe({
        error: (error) => {
          this.toast.error('Token invalido');
          this.router.navigate(['/']);
        }
      });
    });
  }

  onSubmit() {
    this.formSubmitted = true
    
    if (this.password && this.rePassword && this.password.value != this.rePassword.value) {
      this.toast.error('Las contraseñas no coinciden')
      this.formSubmitted = false;
      return;
    }
    if (this.userData.status == 'VALID') {
      const data = this.userData.value
      if (data.password && data.rePassword) {
        this.recoveryPassword(data.password);
      } else {
        this.toast.error('Error al enviar la contraseña')
      }
    } else {
      this.toast.error('Error al enviar la contraseña')
      this.formSubmitted = false;
    }
  }
  recoveryPassword(password: string) {
    // Aqui se deberia hacer la peticion al backend para recuperar la contraseña
    this.authService.recoveryPassword(this.token, password).subscribe({
      next: (response) => {
        this.toast.success('Contraseña actualizada correctamente');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.toast.error('Error al actualizar la contraseña');
        this.formSubmitted = false;
      }
    });
  }
}
