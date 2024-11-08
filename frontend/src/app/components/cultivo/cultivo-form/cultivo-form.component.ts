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
    if (!empresaId) return;
    
    this.campoService.getCamposByEmpresa(empresaId).subscribe({
      next: (campos) => {
        this.campos = campos.data;
      },
      error: (error) => {
        this.toastr.error('No tiene campos', 'Error al cargar los campos');
        console.error('Error al cargar los campos:', error);
        this.campos = [];
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
      this.cargarEmpresas();
      this.cargarGestiones();
      this.cargarEspecies();
      this.cultivoForm.get('empresa')?.enable();
      this.cultivoForm.get('gestion')?.enable();
      this.cultivoForm.get('especie')?.enable();
      this.cultivoForm.get('empresa')?.valueChanges.subscribe((empresaSeleccionada) => {
        if (empresaSeleccionada) {
          this.cultivoForm.get('campo')?.enable(); // Habilitamos el select de campos
        } else {
          this.cultivoForm.get('campo')?.disable(); // Deshabilitamos el select si no hay empresa seleccionada
        }
      });
      this.cultivoForm.get('campo')?.disable();
    }
    this.mostrarModal = true;
  }
  cerrarModal(): void {
    this.mostrarModal = false;
    this.cultivoId = null;
  }
  cargandoCultivoParaEditar(cultivo: Cultivo): void {
    this.campoService.getCampoById(cultivo.campo).subscribe({
      next: (campo) => {
        this.campos = [campo];
        this.cultivoForm.patchValue({
          campo: campo.id
        });
        this.cultivoForm.get('campo')?.disable();
        this.cargarEmpresa(campo.empresa);
        this.cargarGestion(cultivo.gestion);
        this.cargarEspecie(cultivo.especie)
      },
      error: (error) => {
        this.toastr.error('Error al cargar el campo', 'Error');
        console.error('Error al cargar el campo:', error);
        this.cerrarModal();
      }
    });
    this.cultivoForm.patchValue({
      nombre: cultivo.nombre,
      rinde_prom: cultivo.rinde_prom,
      sup_total: cultivo.sup_total,
      descripcion: cultivo.descripcion

    });
  }
  cargarEmpresa(empresaId: string): void {
    this.empresaService.getEmpresaById(empresaId).subscribe({
      next: (empresa) => {
        this.empresas = [empresa];
        this.cultivoForm.patchValue({
          empresa: empresa.id
        });
        this.cultivoForm.get('empresa')?.disable();
      },
      error: (error) => {
        this.toastr.error('Error al cargar la empresa', 'Error');
        console.error('Error al cargar la empresa:', error);
        this.cerrarModal();
      }
    });
  }

  cargarGestion(gestionId: string): void {
    this.gestionService.getGestionById(gestionId).subscribe({
      next: (gestion) => {
        this.gestiones = [gestion];
        this.cultivoForm.patchValue({
          gestion: gestion.id
        });
        this.cultivoForm.get('gestion')?.disable();
      },
      error: (error) => {
        this.toastr.error('Error al cargar la gestión', 'Error');
        console.error('Error al cargar la gestión:', error);
        this.cerrarModal();
      }
    });
    
  }

  cargarEspecie(especieId: string): void {
    this.especieService.obtenerEspecie(especieId).subscribe({
      next: (especie) => {
        this.especies = [especie];
        this.cultivoForm.patchValue({
          especie: especie.id
        });
        this.cultivoForm.get('especie')?.disable();
      },
      error: (error) => {
        this.toastr.error('Error al cargar la especie', 'Error');
        console.error('Error al cargar la especie:', error);
        this.cerrarModal();
      }
    });
  }

  onSubmit(): void {
    if (this.cultivoForm.valid) {
      if (!this.campos.find(campo => campo.id === this.cultivoForm.get('campo')?.value)) {
        this.toastr.error('Campo inválido', 'Error');
        return;
      }
      const cultivoEditado: Cultivo = {
        id: this.cultivoId,
        ...this.cultivoForm.value
      };

      if (this.cultivoId) {
        this.cultivoService.actualizarParcialCultivo(this.cultivoId, cultivoEditado).subscribe({
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
      this.toastr.error('Por favor complete el formulario correctamente', 'Error');
    }
  }
}
