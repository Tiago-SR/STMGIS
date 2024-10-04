import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import Cultivo from '../models/cultivo.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CultivoService {
  private baseUrl = 'http://api.proyecto.local/cultivos/';

  constructor(private http: HttpClient) { }

  obtenerCultivos(): Observable<Cultivo[]> {
    return this.http.get<Cultivo[]>(this.baseUrl);
  }
  eliminarCultivo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}`);
  }
  actualizarCultivo(id: string, cultivo: Cultivo): Observable<Cultivo> {
    return this.http.put<Cultivo>(`${this.baseUrl}${id}/`, cultivo);
  }
  actualizarParcialCultivo(id: string, cultivo: Cultivo): Observable<Cultivo> {
    return this.http.patch<Cultivo>(`${this.baseUrl}${id}/`, cultivo);
  }
  crearCultivo(cultivo: Cultivo): Observable<Cultivo> {
    return this.http.post<Cultivo>(this.baseUrl, cultivo);
  }
}
