import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Campo } from '../models/campo.model';

@Injectable({
    providedIn: 'root'
})
export class CampoService {

    private apiUrl = 'http://api.proyecto.local/campos/';

    constructor(private http: HttpClient) { }

    getCampos(): Observable<any> {
        return this.http.get<any>(this.apiUrl);
    }      

    getCampoById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}${id}/`);
    }
    getCamposByEmpresa(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}?empresa=${id}`);    }

    createCampo(campo: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, campo);
    }

    updateCampo(id: number, campo: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/`, campo);
    }

    deleteCampo(id: number): Observable<any> {
        return this.http.patch(`http://api.proyecto.local/campos/${id}/`, { is_deleted: true });

    }
}