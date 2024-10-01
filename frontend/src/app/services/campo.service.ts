import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError , Observable, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CampoService {

    private apiUrl = 'http://api.proyecto.local/campos/';

    constructor(private http: HttpClient) { }

    getCampos(): Observable<any> {
         const headers = new HttpHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
         });
    
        return this.http.get<any>(this.apiUrl, { headers });
    }      

    getCampoById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}${id}/`);
    }

    getCamposByEmpresa(id: number): Observable<any> {
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

    updateCampo(id: number, campo: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/`, campo);
    }

    // deleteCampo(id: number): Observable<any> {
    //     return this.http.patch(`http://api.proyecto.local/campos/${id}/`, { is_active: false });

    // }
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