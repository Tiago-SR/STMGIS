import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { EspecieService } from '../../../services/especie.service';
import { Especie } from '../../../models/especie.model';
import { EspecieFormComponent } from '../especie-form/especie-form.component';

@Component({
  selector: 'app-especie-list',
  templateUrl: './especie-list.component.html',
  styleUrls: ['./especie-list.component.scss']
})
export class EspecieListComponent implements OnInit {
  especies: Especie[] = [];
  cargando: boolean = true;
  mostrarModal: boolean = false;
  especieSeleccionada: Especie | null = null;

  @ViewChild(EspecieFormComponent) formComponent!: EspecieFormComponent;

  constructor(private especieService: EspecieService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.cargarEspecies();
  }

  cargarEspecies(): void {
    this.cargando = true;
    this.especieService.obtenerEspecies().subscribe({
      next: (data: Especie[]) => {
        this.especies = data;
        this.cargando = false;
      },
      error: (error) => {
        this.toastr.error('Error al cargar los cultivos', 'Error');
        this.cargando = false;
      }
    });
  }

  abrirModalCreacion(): void {
    this.formComponent.abrirModal();
  }

  abrirModal(especie: Especie): void {
    this.especieSeleccionada = especie;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.especieSeleccionada = null;
  }

  confirmarEliminar(): void {
    if (this.especieSeleccionada) {
      this.especieService.eliminarEspecie(this.especieSeleccionada.id!).subscribe({
        next: () => {
          this.eliminarEspecieDeLista(this.especieSeleccionada!.id!);
          this.toastr.success(`Cultivo ${this.especieSeleccionada?.nombre} eliminado con éxito`);
          this.cerrarModal();
        },
        error: (error) => {
          this.toastr.error('Error al eliminar el cultivo', 'Error');
          console.error('Error al eliminar  el cultivo:', error);
        }
      });
    }
  }

  eliminarEspecieDeLista(id: string): void {
    this.especies = this.especies.filter(especie => especie.id !== id);
  }

  actualizarEspecie(especieActualizada: Especie): void {
    const index = this.especies.findIndex(e => e.id === especieActualizada.id);
    if (index !== -1) {
      this.especies[index] = especieActualizada;
    } else {
      this.especies.push(especieActualizada);
    }
  }
}
