export default interface Cultivo {
    id?: string;
    nombre: string;
    descripcion: string;
    campo: string;     // --> referencia o objeto completo?
    gestion: string;   // --> referencia o objeto completo?
    especie: string;   // --> referencia o objeto completo?   
    sup_total: number;
    rinde_prom: number;
    // mapaRinde: Puntos;
    // MapaAmbiente: Poligon;
    // RindeXAmbiente: Excel;
}
