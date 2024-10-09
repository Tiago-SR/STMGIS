import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import Cultivo from '../models/cultivo.model';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CultivoService {
  private baseUrl = 'http://api.proyecto.local/cultivos/';

  constructor(private http: HttpClient) { }

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

  obtenerCultivos(parametrosFiltro?: any): Observable<Cultivo[]> {
    let params = new HttpParams();
    if (parametrosFiltro) {
      Object.keys(parametrosFiltro).forEach(key => {
        if (parametrosFiltro[key] !== null && parametrosFiltro[key] !== undefined) {
          params = params.append(key, parametrosFiltro[key]);
        }
      });
    }
    return this.http.get<Cultivo[]>(this.baseUrl, { params });
  }

  subirArchivosCsv(cultivoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}${cultivoId}/upload-csv/`, formData);
  }
  
}