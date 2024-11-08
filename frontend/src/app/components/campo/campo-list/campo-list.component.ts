import { Component, OnInit } from '@angular/core';
import { Campo } from '../../../models/campo.model';
import { CampoService } from '../../../services/campo.service';
import { Router } from '@angular/router';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import { UserType } from '../../../enums/user-type';
import { FormControl } from '@angular/forms';
import { LoginComponent } from '../../login/login.component';


@Component({
  selector: 'app-campo-list',
  templateUrl: './campo-list.component.html',
  styleUrls: ['./campo-list.component.scss']
})
export class CampoListComponent implements OnInit {
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  selectedEmpresa = new FormControl('');
  isAdmin = false; 
  cargando = false;

  constructor(
    private empresaService: EmpresaService,
    private campoService: CampoService,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService

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
    this.campoService.getCampos().subscribe({
      next: (response) => {
        if (response.success) {
          this.campos = response.data;
        } else {
          console.error('No se pudieron cargar todos los campos');
          this.campos = [];
          this.toastr.error('No se pudieron cargar los campos', 'Error');
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar todos los campos', error);
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
    const selectedEmpresa = this.selectedEmpresa.value;
    if (this.selectedEmpresa.valid && selectedEmpresa) {
      this.campoService.getCamposByEmpresa(selectedEmpresa).subscribe({
        next: (campos) => {
          if (campos.success) {
            this.campos = campos.data;
          }else{
            console.log('No hay campos disponibles para esta empresa.');
            this.toastr.info('No hay campos disponibles para esta empresa', 'Información');

          }
        },
        error: (error) => {
          console.error('Error al obtener campos', error);
          this.campos = [];
          this.toastr.error('Error al filtrar campos por empresa', 'Error');

        }
      });
    } else {
      this.loadCampos(); 
    }
  }

  nuevoCampo() {
    this.router.navigate(['/campos/nuevo']);
  }

  editarCampo(id: number, campo: Campo) {
    this.router.navigate(['campos/editar/',id]);      
  }

  softDeleteCampo(id: number){
    this.campoService.deleteCampo(id).subscribe({
      next: () => {
        console.log('Campo eliminado');
        this.toastr.success('Campo eliminado correctamente', 'Éxito');

        this.loadCampos();  
      },
      error: (error) => {
        console.error('Error al eliminar campo', error);
        this.toastr.error('Error al eliminar campo', 'Error');
      } 
    });
  }
  activateCampo(id: number) {
    this.campoService.activateCampo(id).subscribe(() => {
      this.filterCampos(); 
    });
  }
}
