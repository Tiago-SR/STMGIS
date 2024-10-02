export default interface Cultivo {
    id?: string;
    nombre: string;
    campo: string;     // --> referencia o objeto completo?
    gestion: number;   // --> referencia o objeto completo?
    especie: number;   // --> referencia o objeto completo?   
    sup_total: number;
    rinde_prom: number;
    // mapaRinde: Puntos;
    // MapaAmbiente: Poligon;
    // RindeXAmbiente: Excel;
}
