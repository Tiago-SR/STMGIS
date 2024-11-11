// Ejemplo de cómo importar y usar el modelo en un servicio
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empresa } from '../models/empresa.model';
import { PaginatedResponse } from '../models/paginated-response.model';


@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private baseUrl = 'http://api.proyecto.local/empresas/';

  constructor(private http: HttpClient) { }

  getEmpresasPaginadas(params: any): Observable<PaginatedResponse<Empresa>> {
    let queryParams = new HttpParams();
    Object.keys(params).forEach(key => {
      queryParams = queryParams.append(key, params[key]);
    });

    return this.http.get<PaginatedResponse<Empresa>>(this.baseUrl + 'list/', { params: queryParams });
  }

  getAllEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.baseUrl);
  }
  
  getEmpresaById(id: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.baseUrl}${id}/`);
  }
  
  createEmpresa(empresa: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(this.baseUrl, empresa, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
  
  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.baseUrl}${id}/`, empresa, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
  
  deleteEmpresa(id: number): Observable<any> {
    //return this.http.delete(`${this.baseUrl}/${id}/`);
    return this.http.patch(`http://api.proyecto.local/empresas/${id}/`, { is_deleted: true });

  }
}
