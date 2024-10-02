import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Gestion } from '../models/gestion.model';

@Injectable({
  providedIn: 'root'
})
export class GestionService {
  private baseUrl = 'http://api.proyecto.local/gestiones/';
  constructor(private http: HttpClient) { }
  getAllGestiones(): Observable<Gestion[]> {
    return this.http.get<Gestion[]>(`${this.baseUrl}`);
  }
}
