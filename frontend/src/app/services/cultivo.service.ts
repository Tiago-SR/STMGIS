import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import Cultivo from '../models/cultivo.model';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({
  providedIn: 'root'
})
export class CultivoService {
  private baseUrl = 'http://api.proyecto.local/cultivos/';

  constructor(private http: HttpClient) { }

  obtenerCultivosPaginados(parametrosFiltro?: any): Observable<PaginatedResponse<Cultivo>> {
    let params = new HttpParams();
    if (parametrosFiltro) {
      Object.keys(parametrosFiltro).forEach(key => {
        if (parametrosFiltro[key] !== null && parametrosFiltro[key] !== undefined) {
          const paramKey = key === 'empresa' ? 'campo__empresa' : key;
          params = params.append(paramKey, parametrosFiltro[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Cultivo>>(this.baseUrl + 'list/', { params });
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
  obtenerCultivo(id: string): Observable<Cultivo> {
    return this.http.get<Cultivo>(`${this.baseUrl}${id}`);
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
  subirArchivosCsv(cultivoId: string, formData: FormData, queryParams: string) {
    return this.http.post<any>(`${this.baseUrl}${cultivoId}/upload-csv/${queryParams}`, formData);
  }  
  normalizarMapas(cultivoId: string): Observable<any> {
     return this.http.get<any>(`${this.baseUrl}${cultivoId}/normalizar/`);
  }
   // Método para obtener los datos de normalización
  obtenerDatosNormalizacion(cultivoId: string): Observable<any> {
     return this.http.get<any>(`${this.baseUrl}${cultivoId}/normalizar/`);
  }
  resultadoNormalizacion(cultivoId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}${cultivoId}/resultado-normalizacion/`);
  }
  // Método para confirmar la normalización después de la revisión
  confirmarNormalizacion(cultivoId: string, coeficienteAjuste: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${cultivoId}/confirmar-normalizacion`, { coeficienteAjuste });
  }
  calcularRendimientoAmbiente(cultivoId: string): Observable<Blob> {
    const url = `http://api.proyecto.local/rendimientos/${cultivoId}/calcular-rendimiento/`;
    return this.http.get(url, { responseType: 'blob' });
  }

  descargarExcelRendimiento(cultivoId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`http://api.proyecto.local/rendimientos/${cultivoId}/exportar-excel/`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  obtenerEstaNormalizado(cultivoId: string): Observable<{ all_normalized: boolean }> {
    const url = `${this.baseUrl}${cultivoId}/is-normalized/`;
    return this.http.get<{ all_normalized: boolean }>(url);
  }

  descargarShapefileRendimientoAmbiente(cultivoId: string, nombreCultivo: string): void {
    const url = `http://api.proyecto.local/download-rendimiento-ambiente-shapefile/${cultivoId}`;

    // Crear un enlace temporal para descargar el archivo con el nombre del cultivo
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreCultivo.replace(/ /g, '_')}_rendimiento_ambiente.zip`;
    link.click();
  }

  descargarShapefilePorCultivo(idCampo: string): void {
    const url = `http://api.proyecto.local/download-ambiente-shapefile/${idCampo}`;
    window.open(url, '_blank');
  }

  descargarShapefilePorCultivoData(idCultivo: string): void {
    const url = `http://api.proyecto.local/download-cultivo-data-shapefile/${idCultivo}`;
    window.open(url, '_blank');
  }

  descargarShapefileExtraccionP(idCultivo: string): void {
    const url = `http://api.proyecto.local/download-extraccion-p-shapefile/${idCultivo}`;
    window.open(url, '_blank');
  }

  descargarShapefileExtraccionK(idCultivo: string): void {
    const url = `http://api.proyecto.local/download-extraccion-k-shapefile/${idCultivo}`;
    window.open(url, '_blank');
  }
  descargarShapefileExtraccionN(idCultivo: string): void {
    const url = `http://api.proyecto.local/download-extraccion-n-shapefile/${idCultivo}`;
    window.open(url, '_blank');
  }
  descargarShapefileCoeficienteVariacion(idCultivo: string): void {
    const url = `http://api.proyecto.local/download-coeficiente-variacion-shapefile/${idCultivo}`;
    window.open(url, '_blank');
  }
}