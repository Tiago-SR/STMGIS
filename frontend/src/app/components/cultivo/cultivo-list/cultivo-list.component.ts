import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CultivoService } from '../../../services/cultivo.service';
import Cultivo from '../../../models/cultivo.model';
import { CultivoFormComponent } from '../cultivo-form/cultivo-form.component';

@Component({
  selector: 'app-cultivo-list',
  templateUrl: './cultivo-list.component.html',
  styleUrl: './cultivo-list.component.scss'
})
export class CultivoListComponent implements OnInit {
  cargando = true;
  mostrarModal = false;
  cultivos: Cultivo[] = [];
  cultivoSeleccionado: Cultivo | null = null;

  @ViewChild(CultivoFormComponent) formComponent!: CultivoFormComponent;

  constructor(private toast: ToastrService, private cultivoService: CultivoService) {}

  ngOnInit(): void {
    this.cargarCultivos();
  }
  cargarCultivos(): void {
    this.cargando = true;
    this.cultivoService.obtenerCultivos().subscribe({
      next: (data: Cultivo[]) => {
        this.cultivos = data;
        this.cargando = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar los cultivos', 'Error');
        this.cargando = false;
      }
    });
  }
  abrirModalCreacion(): void {
    this.formComponent.abrirModal();
  }

  abrirModal(cultivo: Cultivo): void {
    this.cultivoSeleccionado = cultivo;
    this.mostrarModal = true;
  }
  cerrarModal(): void {
    this.mostrarModal = false;
    this.cultivoSeleccionado = null;
  }
  confirmarEliminar(): void {
    if (this.cultivoSeleccionado) {
      this.cultivoService.eliminarCultivo(this.cultivoSeleccionado.id!).subscribe({
        next: () => {
          this.eliminarCultivoDeLista(this.cultivoSeleccionado!.id!);
          this.toast.success(`Cultivo ${this.cultivoSeleccionado?.nombre} eliminado con éxito`);
          this.cerrarModal();
        },
        error: (error) => {
          this.toast.error('Error al eliminar el cultivo', 'Error');
          console.error('Error al eliminar el cultivo:', error);
        }
      });
    }
  }
  eliminarCultivoDeLista(id: string): void {
    this.cultivos = this.cultivos.filter(cultivo => cultivo.id !== id);
  }

  actualizarCultivo(cultivoActualizada: Cultivo): void {
    const index = this.cultivos.findIndex(c => c.id === cultivoActualizada.id);
    if (index !== -1) {
      this.cultivos[index] = cultivoActualizada;
    } else {
      this.cultivos.push(cultivoActualizada);
    }
  }
}
