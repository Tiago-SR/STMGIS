import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class  UsuarioService {
  private baseUrl = 'http://api.proyecto.local/users/';
  constructor(private http: HttpClient) { }

  inviteUser(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}invite/`, { email });
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }

  getUser(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${id}`);
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}${id}/`, data);
  }

}
