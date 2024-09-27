import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  userData = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required, 
      Validators.minLength(4) 
    ]),
  });
  formSubmitted = false;
  errorMsg: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.formSubmitted = true
    if (this.userData.status == 'VALID') {
      const data = this.userData.value
      if (data.email && data.password)
        this.login(data.email, data.password)
      else this.formSubmitted = false
    } else this.formSubmitted = false    
  }

  login(email: string, password: string) {
    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.formSubmitted = false;
        this.authService.setTokens(response.access, response.refresh)
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.formSubmitted = false;
        if (error.status === 401) {
          this.errorMsg = "Email o contraseña incorrectos."
        } else {
          this.errorMsg = "Error al Iniciar Sesion, reintentelo.";
        }
      }
    });
  }

  get email() {
    return this.userData.get('email');
  }
  get password() {
    return this.userData.get('password');
  }
}
