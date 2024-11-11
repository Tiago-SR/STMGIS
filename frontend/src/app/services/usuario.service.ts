import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({
  providedIn: 'root'
})
export class  UsuarioService {
  private baseUrl = 'http://api.proyecto.local/users/';
  constructor(private http: HttpClient) { }

  getUsuariosPaginados(page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<any>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
      
    return this.http.get<PaginatedResponse<any>>('http://api.proyecto.local/usuarios/list/', { params });
  }

  inviteUser(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}invite/`, { email });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}forgotpassword/`, { email });
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
