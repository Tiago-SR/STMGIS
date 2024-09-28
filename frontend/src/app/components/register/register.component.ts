import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  userData = new FormGroup({
    nickname: new FormControl('', Validators.required),
    password: new FormControl('', [
      Validators.required, 
      Validators.minLength(4) 
    ]),
    rePassword: new FormControl('', [
      Validators.required, 
      Validators.minLength(4),
    ]),
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
  });



  formSubmitted = false;
  errorMsg: string = '';

  private token: string = '';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute, private toast: ToastrService) {}
  
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token') ?? '';
      if (!this.token) this.router.navigate(['/']);
      this.authService.checkRegisterToken(this.token).subscribe({
        error: (error) => {
          this.toast.error('Token invalido', '' , {
            positionClass: 'toast-top-center'
          });
          this.router.navigate(['/']);
        }
      });
    });
  }

  onSubmit() {
    this.formSubmitted = true
    console.log(this.password?.value, this.rePassword?.value);
    
    if (this.password && this.rePassword && this.password.value != this.rePassword.value) {
      this.errorMsg = "Las contraseñas no coinciden.";
      return;
    }
    if (this.userData.status == 'VALID') {
      const data = this.userData.value
      if (data.nickname && data.password && data.firstName && data.lastName) {
        this.register(this.token, data.nickname, data.password, data.firstName, data.lastName);
        console.log('Registering user...');
      } else {
        // AQUI SE DEBERIA MOSTRAR UN ERROR
      }
    }
  }

  register(token: string, username: string, password: string, firstName: string, lastName: string) {
    this.authService.register(token, username, password, firstName, lastName).subscribe({
      next: (response) => {
        this.toast.success('Usuario registrado correctamente');
        this.router.navigate(['/login']);
        console.log(response); 
      },
      error: (error) => {
        console.log(error);
        if (error.status === 401) {
          this.errorMsg = "Nickname o contraseña incorrectos."
        } else if (error.error) {
            this.errorMsg = error.error;
        } else {
          this.errorMsg = "Error al Iniciar Sesion, reintentelo.";
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
  get firstName() {
    return this.userData.get('firstName');
  }
  get lastName() {
    return this.userData.get('lastName');
  }
  get rePassword() {
    return this.userData.get('rePassword');
  }
}
