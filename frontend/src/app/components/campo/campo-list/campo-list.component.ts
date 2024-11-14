import { Component, OnInit } from '@angular/core';
import { Campo } from '../../../models/campo.model';
import { CampoService } from '../../../services/campo.service';
import { Router } from '@angular/router';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import { UserType } from '../../../enums/user-type';
import {ConfirmationService} from "../../../services/confirmation.service";

@Component({
  selector: 'app-campo-list',
  templateUrl: './campo-list.component.html',
  styleUrls: ['./campo-list.component.scss']
})
export class CampoListComponent implements OnInit {
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  selectedEmpresa = '';
  isAdmin = false; 
  cargando = false;
  resetearForm = false;
  totalItems = 0;
  currentPage = 1;
  pageSize = 20;

  constructor(
    private empresaService: EmpresaService,
    private campoService: CampoService,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadEmpresas();
    this.loadCampos();
    this.checkAdminStatus();

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    
    if (state) {
      if (state["message"]) {
        if (state["type"] === 'success') {
          this.toastr.success(state["message"], 'Éxito');
        } else if (state["type"] === 'error') {
          this.toastr.error(state["message"], 'Error');
        }
      }
    }
  }

  loadEmpresas() {
    this.cargando = true;
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener empresas', error);
        this.toastr.error('Error al cargar empresas', 'Error');
        this.cargando = false;
      }
    });
  }

  loadCampos() {
    this.cargando = true;
    const parametrosFiltro = {
      page: this.currentPage,
      page_size: this.pageSize,
      empresa: this.selectedEmpresa
    };

    this.campoService.getCamposPaginados(parametrosFiltro).subscribe({
      next: (data) => {
        this.campos = data.results;
        this.totalItems = data.count;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar campos', error);
        this.campos = [];
        this.toastr.error('Error al cargar los campos', 'Error');
        this.cargando = false;
      }
    });
  }

  checkAdminStatus() {
    this.isAdmin = this.authService.getUserType() === UserType.ADMIN;
  }

  filterCampos() {
    this.currentPage = 1;
    this.loadCampos();
  }

  resetearFiltros(): void {
    this.resetearForm = false;
    this.selectedEmpresa = '';
    this.currentPage = 1;
    this.loadCampos();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCampos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCampos();
    }
  }

  nuevoCampo() {
    this.router.navigate(['/campos/nuevo']);
  }

  editarCampo(id: string, campo: Campo) {
    this.router.navigate(['campos/editar/',id]);      
  }

  softDeleteCampo(id: string) {
    this.confirmationService.requestConfirmation(
      'Eliminar Campo',
      '¿Estás seguro de que deseas eliminar este campo?'
    ).then((confirmed) => {
      if (confirmed) {
        this.campoService.deleteCampo(id).subscribe({
          next: () => {
            this.toastr.success('Campo eliminado correctamente', 'Éxito');
            this.loadCampos();
          },
          error: (error) => {
            console.error('Error al eliminar campo', error);
            this.toastr.error('Error al eliminar campo', 'Error');
          }
        });
      }
    });
  }

  activateCampo(id: string) {
    this.campoService.activateCampo(id).subscribe({
      next: () => {
        this.filterCampos();
      },
      error: (error) => {
        console.error('Error al activar campo', error);
        this.toastr.error('Error al activar campo', 'Error');
      }
    });
  }

  onFiltroChange(): void {
    this.resetearForm = true;
    this.currentPage = 1;
    this.loadCampos();
  }
}
