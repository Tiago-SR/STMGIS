import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CultivoService } from '../../../services/cultivo.service';
import Cultivo from '../../../models/cultivo.model';
import { CultivoFormComponent } from '../cultivo-form/cultivo-form.component';
import { EmpresaService } from '../../../services/empresa.service';
import { EspecieService } from '../../../services/especie.service';
import { CampoService } from '../../../services/campo.service';
import { GestionService } from '../../../services/gestion.service';
import { Empresa } from '../../../models/empresa.model';
import { Especie } from '../../../models/especie.model';
import { Campo } from '../../../models/campo.model';
import { Gestion } from '../../../models/gestion.model';
import { PaginatedResponse } from '../../../models/paginated-response.model';

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
  resetearForm: boolean = false;
  // Propiedades para paginación
  totalItems = 0;
  currentPage = 1;
  pageSize = 20;

  // Propiedades para filtros
  empresas: Empresa[] = [];
  especies: Especie[] = [];
  campos: Campo[] = [];
  gestiones: Gestion[] = [];

  selectedEmpresa: string = '';
  selectedEspecie: string = '';
  selectedCampo: string = '';
  selectedGestion: string = '';

  @ViewChild(CultivoFormComponent) formComponent!: CultivoFormComponent;

  constructor(
    private toast: ToastrService,
    private cultivoService: CultivoService,
    private empresaService: EmpresaService,
    private especieService: EspecieService,
    private campoService: CampoService,
    private gestionService: GestionService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCultivos();
    this.cargarEmpresas();
    this.cargarEspecies();
    this.cargarCampos();
    this.cargarGestiones();
    console.log('results totales:', this.cultivos);
  }

  cargarEspecies() {
    this.especieService.obtenerEspecies().subscribe(
      data => {
        this.especies = data;
      },
      error => {
        this.toast.error('Error al cargar las especies', 'Error');
        console.error('Error al cargar las especies', error);
      }
    );
  }

  cargarEmpresas() {
    this.cargando = true;
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener empresas', error);
        this.toast.error('Error al cargar empresas', 'Error');
        this.cargando = false;
      }
    });
  }

  cargarCampos() {
    this.campoService.getCampos().subscribe({
      next: (response) => {
        if (response.success) {
          this.campos = response.data;
        } else {
          console.error('No se pudieron cargar los campos')
          this.campos = [];
        }
      },
      error: (error) => {
        console.error('Error al cargar todos los campos', error);
        this.campos = [];
      }
    });
  }

  cargarCamposPorEmpresa(empresaId: string) {
    this.campoService.getCamposByEmpresa(empresaId.toString()).subscribe(
      response => {
        this.campos = response.data;
      },
      error => {
        this.toast.error('Error al cargar los campos', 'Error');
        console.error('Error al cargar los campos', error);
      }
    );
  }

  cargarCultivos(): void {
    this.cargando = true;
    this.cultivos = [];
  
    const parametrosFiltro = {
      page: this.currentPage,
      page_size: this.pageSize,
      empresa: this.selectedEmpresa,
      especie: this.selectedEspecie,
      campo: this.selectedCampo,
      gestion: this.selectedGestion
    };
  
    this.cultivoService.obtenerCultivosPaginados(parametrosFiltro).subscribe({
      next: (data: PaginatedResponse<Cultivo>) => {
        this.cultivos = data.results;
        this.totalItems = data.count;
        this.cargando = false;
        this.changeDetector.detectChanges();
      },
      error: (error) => {
        this.cargando = false;
        this.toast.error('Error al cargar los cultivos', 'Error');
        console.error('Error al cargar los cultivos:', error);
      }
    });
  }
  

  cargarGestiones() {
    this.gestionService.getAllGestiones().subscribe(
      gestiones => {
        this.gestiones = gestiones;
      },
      error => {
        console.error('Error al cargar las gestiones:', error);
        this.toast.error('Error al cargar las gestiones', 'Error');
      }
    );
  }

  onFiltroChangeEmpresa(): void {
    if (this.selectedEmpresa) {
      this.selectedCampo = '';
      this.cargarCamposPorEmpresa(this.selectedEmpresa);
    } else {
      this.cargarCampos();
    }
    this.onFiltroChange();
  }

  onFiltroChange(): void {
    this.resetearForm = true;
    this.currentPage = 1;
    this.cargarCultivos();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cargarCultivos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cargarCultivos();
    }
  }

  resetearFiltros(): void {
    this.resetearForm = false;
    this.selectedEmpresa = '';
    this.selectedEspecie = '';
    this.selectedCampo = '';
    this.selectedGestion = '';
    this.currentPage = 1;
    this.cargarCampos();
    this.cargarCultivos();
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