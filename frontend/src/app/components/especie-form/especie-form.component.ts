import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Especie } from '../../models/especie.model';
import { EspecieService } from '../../services/especie.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-especie-form',
  templateUrl: './especie-form.component.html',
  styleUrls: ['./especie-form.component.scss']
})
export class EspecieFormComponent implements OnInit {
  especieForm!: FormGroup;
  mostrarModal: boolean = false;
  especieId!: string | null;

  @Output() especieActualizada = new EventEmitter<Especie>();

  constructor(
    private fb: FormBuilder,
    private especieService: EspecieService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.especieForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      humedad_minima: [0, [Validators.required, Validators.min(0)]],
      humedad_maxima: [0, [Validators.required, Validators.min(0)]],
      nitrogeno: [0, [Validators.min(0)]],
      fosforo: [0, [Validators.min(0)]],
      potasio: [0, [Validators.min(0)]],
      variacion_admitida: [0, [Validators.required, Validators.min(0)]],
      descripcion: ['']
    }, {
      validators: this.humedadMaximaMayorQueMinima
    });
  }


  humedadMaximaMayorQueMinima(group: AbstractControl): ValidationErrors | null {
    const humedadMinima = group.get('humedad_minima')?.value;
    const humedadMaxima = group.get('humedad_maxima')?.value;
    return humedadMaxima > humedadMinima ? null : { humedadMaximaMenor: true };
  }

  abrirModal(especie?: Especie): void {
    if (especie) {
      this.especieId = especie.id || null;
      this.cargarEspecieParaEditar(especie);
    } else {
      this.especieId = null;
      this.especieForm.reset(); // Resetear formulario para nueva creación
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.especieId = null;
  }

  cargarEspecieParaEditar(especie: Especie): void {
    this.especieForm.patchValue({
      nombre: especie.nombre,
      descripcion: especie.descripcion,
      humedad_minima: especie.humedad_minima,
      humedad_maxima: especie.humedad_maxima,
      variacion_admitida: especie.variacion_admitida,
      nitrogeno: especie.nutrientes.Nitrogeno,
      fosforo: especie.nutrientes.Fosforo,
      potasio: especie.nutrientes.Potasio
    });
  }

  onSubmit(): void {
    if (this.especieForm.valid) {
      const nutrientes = {
        Nitrogeno: this.especieForm.get('nitrogeno')?.value || 0,
        Fosforo: this.especieForm.get('fosforo')?.value || 0,
        Potasio: this.especieForm.get('potasio')?.value || 0
      };

      const especieEditada: Especie = {
        id: this.especieId,
        ...this.especieForm.value,
        nutrientes
      };

      if (this.especieId) {
        this.especieService.actualizarEspecie(this.especieId, especieEditada).subscribe({
          next: (especie) => {
            this.especieActualizada.emit(especie);
            this.toastr.success(`Especie "${especie.nombre}" actualizada con éxito`);
            this.cerrarModal();
            this.especieForm.reset();
          },
          error: (error) => {
            this.toastr.error('Error al actualizar la especie', 'Error');
            console.error('Error al actualizar la especie:', error);
          }
        });
      } else {
        this.especieService.crearEspecie(especieEditada).subscribe({
          next: (especie) => {
            this.especieActualizada.emit(especie);
            this.toastr.success(`Especie "${especie.nombre}" creada con éxito`);
            this.cerrarModal();
            this.especieForm.reset();
          },
          error: (error) => {
            this.toastr.error('Error al crear la especie', 'Error');
            console.error('Error al crear la especie:', error);
          }
        });
      }
    } else {
      this.especieForm.markAllAsTouched();
    }
  }
}
