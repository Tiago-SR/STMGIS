import { Component, EventEmitter, Input, Output } from '@angular/core';
import Cultivo from '../../../models/cultivo.model';

@Component({
  selector: 'app-cultivo-card',
  templateUrl: './cultivo-card.component.html',
  styleUrl: './cultivo-card.component.scss'
})
export class CultivoCardComponent {
  @Input() cultivo: Cultivo | undefined;
  @Output() editarCultivo = new EventEmitter<Cultivo>();
  @Output() cultivoEliminado = new EventEmitter<Cultivo>();
  onEditar() {
    if (this.cultivo) {
      this.editarCultivo.emit(this.cultivo);
    }
  }
  onEliminar() {
    if (this.cultivo) {
      this.cultivoEliminado.emit(this.cultivo);
    }
  }
}
