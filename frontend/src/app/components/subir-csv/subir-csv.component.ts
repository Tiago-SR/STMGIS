import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Empresa } from '../../models/empresa.model';
import { Campo } from '../../models/campo.model';
import { Especie } from '../../models/especie.model';
import Cultivo from '../../models/cultivo.model';
import { EmpresaService } from '../../services/empresa.service';
import { CampoService } from '../../services/campo.service';
import { CultivoService } from '../../services/cultivo.service';
import { EspecieService } from '../../services/especie.service';
import { ToastrService } from 'ngx-toastr';
import { UploadService } from '../../services/upload.service';
import { PaginatedResponse } from '../../models/paginated-response.model';

@Component({
  selector: 'app-subir-csv',
  templateUrl: './subir-csv.component.html',
  styleUrls: ['./subir-csv.component.scss']
})
export class SubirCsvComponent implements OnInit {
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  especies: Especie[] = [];
  cultivos: Cultivo[] = [];
  cultivosTodos: Cultivo[] = [];
  archivosCsv: File[] = [];

  empresaSeleccionadaId: number | null = null;
  campoSeleccionadoId: number | null = null;
  especieSeleccionadaId: string | null = null;
  cultivoSeleccionadoId: string | null = null;

  csvForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private campoService: CampoService,
    private cultivoService: CultivoService,
    private especieService: EspecieService,
    private cd: ChangeDetectorRef,
    private toastr: ToastrService,
    private uploadService: UploadService
  ) {
    this.csvForm = this.fb.group({
      cultivo: [null, Validators.required],
      archivos: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarEspecies();
  }

  cargarEmpresas() {
    this.empresaService.getAllEmpresas().subscribe(
      data => {
        this.empresas = data;
      },
      error => {
        console.error('Error al cargar las empresas', error);
      }
    );
  }

  onEmpresaChange() {
    if (this.empresaSeleccionadaId) {
      this.cargarCamposPorEmpresa(this.empresaSeleccionadaId);
      this.campoSeleccionadoId = null;
      this.cultivos = [];
      this.cultivosTodos = [];
      this.especieSeleccionadaId = null;
    } else {
      this.campos = [];
      this.cultivos = [];
      this.cultivosTodos = [];
    }
    this.resetForm();
  }

  cargarCamposPorEmpresa(empresaId: number) {
    this.campoService.getCamposByEmpresa(empresaId.toString()).subscribe(
      response => {
        this.campos = response.data;
        this.cd.detectChanges();
      },
      error => {
        this.toastr.error('Error al cargar los campos', 'Error');
        console.error('Error al cargar los campos', error);
      }
    );
  }

  onCampoChange() {
    this.especieSeleccionadaId = null;
    this.cargarCultivos();
    this.resetForm();
  }

  cargarEspecies() {
    this.especieService.obtenerEspecies().subscribe(
      data => {
        this.especies = data;
      },
      error => {
        this.toastr.error('Error al cargar las especies', 'Error');
        console.error('Error al cargar las especies', error);
      }
    );
  }

  onEspecieChange() {
    this.aplicarFiltroEspecie();
    this.resetForm();
  }

  cargarCultivos() {
    const parametrosFiltro: any = {};
    if (this.campoSeleccionadoId) {
      parametrosFiltro['campo'] = this.campoSeleccionadoId;
    }

    this.cultivoService.obtenerCultivos(parametrosFiltro).subscribe(
      data => {
        this.cultivosTodos = data;
        this.aplicarFiltroEspecie();
      },
      error => {
        this.toastr.error('Error al cargar los cultivos', 'Error');
        console.error('Error al cargar los cultivos', error);
      }
    );
  }

  aplicarFiltroEspecie() {
    if (this.especieSeleccionadaId) {
      this.cultivos = this.cultivosTodos.filter(cultivo => cultivo.especie === this.especieSeleccionadaId);
    } else {
      this.cultivos = [...this.cultivosTodos];
    }

    if (this.cultivos.length === 0) {
      this.csvForm.get('cultivo')?.setErrors({ noCultivos: true });
    } else {
      this.csvForm.get('cultivo')?.setErrors(null);
    }
  }

  onArchivoSeleccionado(event: any) {
    if (event.target.files) {
      this.archivosCsv = Array.from(event.target.files);
      this.csvForm.patchValue({ archivos: this.archivosCsv });
    }
  }

  resetForm() {
    if (this.cultivos.length < 1) {
      this.csvForm.get('cultivo')?.setErrors({ incorrecto: true });
      this.csvForm.get('cultivo')?.markAsTouched();
    }
  }

  subirArchivosCsv() {
    if (this.csvForm.invalid) {
      this.toastr.warning('Por favor, selecciona un cultivo y sube al menos un archivo CSV.', 'Formulario incompleto');
      return;
    }

    const formData = new FormData();
    this.archivosCsv.forEach((file) => {
      formData.append('archivos_csv', file, file.name);
    });

    this.cultivoService.subirArchivosCsv(this.csvForm.get('cultivo')?.value, formData).subscribe(
      response => {
        if (response.archivos_no_procesados && response.archivos_no_procesados.length > 0) {
          this.toastr.warning(
            `Algunos ya fueron procesados anteriormente: ${response.archivos_no_procesados.join(', ')}. Solo se procesarán los archivos nuevos.`,
            'Advertencia',
            { enableHtml: true }
          );
        } else {
          this.toastr.success(response.message || 'Archivos subidos exitosamente.', 'Éxito');
          this.csvForm.reset({
            cultivo: null,
            archivos: null
          });

          this.archivosCsv = [];
          this.empresaSeleccionadaId = null;
          this.campoSeleccionadoId = null;
          this.especieSeleccionadaId = null;
          this.cultivoSeleccionadoId = null;
          this.cultivos = [];
          this.campos = [];
          this.especies = [];

          this.cd.detectChanges();

          const fileInput = document.getElementById('archivosCsv') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }

          this.csvForm.markAsPristine();
          this.csvForm.markAsUntouched();
          this.csvForm.updateValueAndValidity();
        }

        if (response.upload_id) {
          this.uploadService.setUploadId(response.upload_id);
        }
      },
      error => {
        if (error.status === 400) {
          const errorMessage = error.error?.error || 'Error desconocido al procesar los archivos.';
          this.toastr.error(errorMessage, 'Error al subir los archivos');
        } else {
          this.toastr.error('Error inesperado al subir los archivos.', 'Error');
        }
      }
    );
  }
}
