export interface Responsable {
    id: number;
    username: string;
    is_active: boolean;
    first_name: string;
    last_name: string;
    email: string;
    descripcion: string | undefined;
    empresas: number[];
}