import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError , Observable, throwError } from 'rxjs';
import { Campo } from '../models/campo.model';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({
    providedIn: 'root'
})
export class CampoService {

    private apiUrl = 'http://api.proyecto.local/campos/';

    constructor(private http: HttpClient) { }

    getCamposPaginados(parametrosFiltro?: any): Observable<PaginatedResponse<Campo>> {
        let params = new HttpParams();
    
        if (parametrosFiltro) {
            Object.keys(parametrosFiltro).forEach(key => {
                if (parametrosFiltro[key] !== null && parametrosFiltro[key] !== undefined) {
                    params = params.append(key, parametrosFiltro[key]);
                }
            });
        }
    
        return this.http.get<PaginatedResponse<Campo>>(this.apiUrl + 'list/', { params });
    }
    

    getCampos(): Observable<any> {
         const headers = new HttpHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
         });
    
        return this.http.get<any>(this.apiUrl, { headers });
    }      

    getCampoById(id: string): Observable<Campo> {
        return this.http.get<Campo>(`${this.apiUrl}${id}/`);
    }

    getCamposByEmpresa(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}?empresa=${id}`);
    }

    createCampo(formData: FormData): Observable<any> {
        return this.http.post<any>(this.apiUrl, formData).pipe(
            catchError(error => {
                console.error('Error al crear el campo:', error);
                return throwError(error);
            })
        );
    }

    updateCampo(id: number, campo: Campo): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/`, campo);
    }

    deleteCampo(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}${id}/deactivate/`, {}).pipe(
            catchError(error => {
                console.error('Error al desactivar el campo:', error);
                return throwError(error);
            })
        );
    }

    activateCampo(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}activate/${id}/`, {});
      }
}