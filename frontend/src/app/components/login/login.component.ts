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
    nickname: new FormControl('', Validators.required),
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
      if (data.nickname && data.password)
        this.login(data.nickname, data.password)
      else {
        // AQUI SE DEBERIA MOSTRAR UN ERROR
      }
    }
  }

  login(username: string, password: string) {
    this.authService.login(username, password).subscribe({
      next: (response) => {
        this.authService.setTokens(response.access, response.refresh)
        this.router.navigate(['/']);
      },
      error: (error) => {
        if (error.status === 401) {
          this.errorMsg = "Nickname o contraseña incorrectos."
        } else {
          console.error("Error al Iniciar Sesion, reintentelo.");
        }
      }
    });
  }

  get userName() {
    return this.userData.get('nickname');
  }
  get password() {
    return this.userData.get('password');
  }
}
