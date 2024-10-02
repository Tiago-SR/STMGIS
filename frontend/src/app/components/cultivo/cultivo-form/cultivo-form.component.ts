import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CultivoService } from '../../../services/cultivo.service';
import { ToastrService } from 'ngx-toastr';
import Cultivo from '../../../models/cultivo.model';
import { Empresa } from '../../../models/empresa.model';
import { EmpresaService } from '../../../services/empresa.service';
import { Campo } from '../../../models/campo.model';
import { CampoService } from '../../../services/campo.service';
import { GestionService } from '../../../services/gestion.service';
import { Gestion } from '../../../models/gestion.model';
import { Especie } from '../../../models/especie.model';
import { EspecieService } from '../../../services/especie.service';

@Component({
  selector: 'app-cultivo-form',
  templateUrl: './cultivo-form.component.html',
  styleUrl: './cultivo-form.component.scss'
})
export class CultivoFormComponent {
  cultivoForm!: FormGroup;
  mostrarModal: boolean = false;
  cultivoId!: string | null;
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  gestiones: Gestion[] = [];
  especies: Especie[] = [];

  @Output() cultivoActualizado = new EventEmitter<Cultivo>();

  constructor(
    private fb: FormBuilder,
    private cultivoService: CultivoService,
    private toastr: ToastrService,
    private empresaService: EmpresaService,
    private campoService: CampoService,
    private gestionService: GestionService,
    private especieService: EspecieService
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarGestiones();
    this.cargarEspecies();
    this.cultivoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      sup_total: [0, [Validators.required, Validators.min(0)]],
      rinde_prom: [0, [Validators.required, Validators.min(0)]],
      empresa: [null, [Validators.required]],
      campo: [null, [Validators.required]],
      gestion: [null, [Validators.required]],
      especie: [null, [Validators.required]]
    });
    this.cultivoForm.get('empresa')?.valueChanges.subscribe((empresaSeleccionada) => {
      if (empresaSeleccionada) {
        this.cultivoForm.get('campo')?.enable(); // Habilitamos el select de campos
      } else {
        this.cultivoForm.get('campo')?.disable(); // Deshabilitamos el select si no hay empresa seleccionada
      }
    });
  }
  cargarEmpresas(): void {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => {
        this.toastr.error('Error al cargar las empresas', 'Error');
        console.error('Error al cargar las empresas:', error);
      }
    });
  }

  cargarCampos(): void {
    const empresaId = this.cultivoForm.value.empresa;
    if (!empresaId) return    
    this.campoService.getCamposByEmpresa(empresaId).subscribe({
      next: (campos) => {
        this.campos = campos.data;
      },
      error: (error) => {
        this.toastr.error('No tiene campos', 'Error al cargar los campos');
        console.error('Error al cargar los campos:', error);
      }
    });
  }

  cargarGestiones(): void {
    this.gestionService.getAllGestiones().subscribe({
      next: (gestiones) => {
        this.gestiones = gestiones;
      },
      error: (error) => {
        this.toastr.error('Error al cargar las gestiones', 'Error');
        console.error('Error al cargar las gestiones:', error);
      }
    });
  }

  cargarEspecies(): void {
    this.especieService.obtenerEspecies().subscribe({
      next: (especies) => {
        this.especies = especies;
      },
      error: (error) => {
        this.toastr.error('Error al cargar las especies', 'Error');
        console.error('Error al cargar las especies:', error);
      }
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
