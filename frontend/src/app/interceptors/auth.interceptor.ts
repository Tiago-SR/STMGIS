import { Injectable, NgZone } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router, private ngZone: NgZone) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.logoutAndRedirect();
          } else if (error.status === 403) {
            this.router.navigate(['/']);
          }
          return throwError(error);
        })
      );
    } else {
      return next.handle(req).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.logoutAndRedirect();
          } else if (error.status === 403) {
            this.router.navigate(['/']);
          }
          return throwError(error);
        })
      );
    }
  }

  private logoutAndRedirect(): void {
    localStorage.removeItem('access_token');
    this.ngZone.run(() => {
      this.router.navigate(['/login']);
    });
  }
}
