// src/app/models/campo.model.ts
export interface Campo {
  id?: number;
  nombre: string;
  superficie: number;
  departamento: string;
  empresa: string;
  is_active: boolean;
  dbfFile?: any;
  shpFile?: any;
  shxFile?: any;
}
