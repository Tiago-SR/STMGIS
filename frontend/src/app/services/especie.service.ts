import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Especie } from '../models/especie.model';

@Injectable({
  providedIn: 'root'
})
export class EspecieService {
 
  private baseUrl = 'http://api.proyecto.local/especies/';

  constructor(private http: HttpClient) {}

  crearEspecie(especie: Especie): Observable<Especie> {
    return this.http.post<Especie>(this.baseUrl, especie);
  }



  obtenerEspecies(): Observable<Especie[]> {
    return this.http.get<Especie[]>(this.baseUrl);
  }

  obtenerEspecie(id: string): Observable<Especie> {
    return this.http.get<Especie>(`${this.baseUrl}${id}`);
  }

  actualizarEspecie(id: string, especie: Especie): Observable<Especie> {
    return this.http.put<Especie>(`${this.baseUrl}${id}/`, especie);
  }

  eliminarEspecie(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}`);
  }
}
