// src/app/models/campo.model.ts
export class Campo {
    id?: number;
    nombre: string = '';
    superficie: number = 0;
    departamento: string = '';
    empresaId: number = 0;
    is_active: boolean  = true;
    dbfFile?: any;
    shpFile?: any;
    shxFile?: any;
  }
  