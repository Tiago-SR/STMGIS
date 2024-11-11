import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Especie } from '../../../models/especie.model';

@Component({
  selector: 'app-especie-card',
  templateUrl: './especie-card.component.html',
  styleUrls: ['./especie-card.component.scss']
})
export class EspecieCardComponent {
  @Input() especie: Especie | undefined;
  @Output() editarEspecie = new EventEmitter<Especie>();
  @Output() especieEliminada = new EventEmitter<Especie>();

  onEditar() {
    if (this.especie) {
      this.editarEspecie.emit(this.especie);
    }
  }

  onEliminar() {
    if (this.especie) {
      this.especieEliminada.emit(this.especie);
    }
  }
}
