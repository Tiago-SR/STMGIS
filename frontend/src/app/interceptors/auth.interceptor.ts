import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private toastr: ToastrService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');
    const authReq = token ? req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    }) : req;

    return next.handle(authReq).pipe(
      catchError((error, caught) => {
        if ((error.status === 401 || error.status === 403) && !req.url.includes('/api/token/')) {
          this.authService.logout();
          this.toastr.info('Sesión expirada');
        }
        return throwError(error);
      })
    );
  }

}
