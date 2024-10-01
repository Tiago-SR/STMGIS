import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CultivoService } from '../../../services/cultivo.service';
import { ToastrService } from 'ngx-toastr';
import Cultivo from '../../../models/cultivo.model';

@Component({
  selector: 'app-cultivo-form',
  templateUrl: './cultivo-form.component.html',
  styleUrl: './cultivo-form.component.scss'
})
export class CultivoFormComponent {
  cultivoForm!: FormGroup;
  mostrarModal: boolean = false;
  cultivoId!: string | null;

  @Output() cultivoActualizado = new EventEmitter<Cultivo>();

  constructor(
    private fb: FormBuilder,
    private cultivoService: CultivoService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cultivoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      sup_total: [0, [Validators.required, Validators.min(0)]],
      rinde_prom: [0, [Validators.required, Validators.min(0)]],
    });
  }

  abrirModal(cultivo?: Cultivo): void {
    if (cultivo) {
      this.cultivoId = cultivo.id || null;
      this.cargandoCultivoParaEditar(cultivo);
    } else {
      this.cultivoId = null;
      this.cultivoForm.reset(); // Resetear formulario para nueva creación
    }
    this.mostrarModal = true;
  }
  cerrarModal(): void {
    this.mostrarModal = false;
    this.cultivoId = null;
  }
  cargandoCultivoParaEditar(cultivo: Cultivo): void {
    this.cultivoForm.patchValue({
      nombre: cultivo.nombre,
      rinde_prom: cultivo.rinde_prom,
      sup_total: cultivo.sup_total,

    });
  }
  onSubmit(): void {
    if (this.cultivoForm.valid) {
      const cultivoEditado: Cultivo = {
        id: this.cultivoId,
        ...this.cultivoForm.value
      };

      if (this.cultivoId) {
        this.cultivoService.actualizarCultivo(this.cultivoId, cultivoEditado).subscribe({
          next: (cultivo) => {
            this.cultivoActualizado.emit(cultivo);
            this.toastr.success(`Especie "${cultivo.nombre}" actualizada con éxito`);
            this.cerrarModal();
            this.cultivoForm.reset();
          },
          error: (error) => {
            this.toastr.error('Error al actualizar la especie', 'Error');
            console.error('Error al actualizar la especie:', error);
          }
        });
      } else {
        this.cultivoService.crearCultivo(cultivoEditado).subscribe({
          next: (cultivo) => {
            this.cultivoActualizado.emit(cultivo);
            this.toastr.success(`Especie "${cultivo.nombre}" creada con éxito`);
            this.cerrarModal();
            this.cultivoForm.reset();
          },
          error: (error) => {
            this.toastr.error('Error al crear la especie', 'Error');
            console.error('Error al crear la especie:', error);
          }
        });
      }
    } else {
      this.cultivoForm.markAllAsTouched();
    }
  }
}
