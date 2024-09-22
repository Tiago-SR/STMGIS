import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://api.proyecto.local/api/token/';

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

  login(username: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl, { username, password });
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
}
