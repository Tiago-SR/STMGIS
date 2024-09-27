import { Nutriente } from "./enums/nutriente.enum";

type CoeficienteExtraccion = { [key in Nutriente]: number };

export interface Especie {
  id?: string;
  nombre: string;
  humedad_minima: number;
  humedad_maxima: number;
  variacion_admitida: number;
  descripcion?: string;
  nutrientes: CoeficienteExtraccion;
}
