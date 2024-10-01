import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserType } from '../enums/user-type';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://api.proyecto.local/';
  private apiUrl = this.baseUrl + 'api/token/';

  private loggedIn = new BehaviorSubject<{isLogged: boolean, nickName: string}>({ isLogged: this.hasToken(), nickName: this.nickName});
  private userType = new BehaviorSubject<string>('');

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }
  private get nickName(): string {
    const token = localStorage.getItem('access_token')
    if (!token) return ''
    return JSON.parse(atob(token.split('.')[1])).userName
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl, { email, password });
  }
  get isLoggedIn(): Observable<{isLogged: boolean, nickName: string}> {
    return this.loggedIn.asObservable();
  }

  get isUserType(): Observable<string> {
    return this.userType.asObservable();
  }
  private isTokenExpired(token: string): boolean {
    const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
    const expirationDate = decodedToken.exp * 1000;
    const now = Date.now();

    return expirationDate < now;
  }

  refreshAccessToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}refresh/`, { refresh: refreshToken });
  }

  setTokens(accessToken: string, refreshToken: string) {
    // localStorage.setItem('access_token', response.access);
    // localStorage.setItem('refresh_token', response.refresh);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    this.loggedIn.next({isLogged: true, nickName: this.nickName});
  }

  getTokens(): {token: string | null, refreshToken: string | null} {
    return { token: localStorage.getItem('access_token'), refreshToken: localStorage.getItem('refresh_token')}
  }
  

  checkAndRenewToken() {
    const { token, refreshToken } = this.getTokens();
    if (!token || !refreshToken) return
    if (this.isTokenExpired(token) && refreshToken) {
      this.refreshAccessToken(refreshToken).subscribe((response: any) => {
        this.setTokens(response.access, refreshToken);
      });
    }
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.loggedIn.next({ isLogged: false, nickName: '' });
    this.router.navigate(['/login']);
  }

  getUserType(): null | UserType.ADMIN | UserType.RESPONSABLE {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    const userType = JSON.parse(atob(token.split('.')[1])).userType
    if (userType !== UserType.ADMIN && userType !== UserType.RESPONSABLE) return null
    return userType
  }

  checkRegisterToken(token: string): Observable<any> {
    return this.http.get(this.baseUrl + 'register/check_register_token?token=' + token);
  }

  register(token:string, username: string, password: string, firstName: string, lastName: string) {
    return this.http.post(this.baseUrl + 'register/', { token, username, password, firstName, lastName });
  }

  recoveryPassword(token: string, password: string): Observable<any> {
    return this.http.post(this.baseUrl + `register/recovery_password/`, { token, password });
  }
}
