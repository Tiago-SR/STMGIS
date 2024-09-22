import { Component, OnInit } from '@angular/core';
import { Campo } from '../../../models/campo.model';
import { CampoService } from '../../../services/campo.service';
import { Router } from '@angular/router';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';


@Component({
  selector: 'app-campo-list',
  templateUrl: './campo-list.component.html',
  styleUrls: ['./campo-list.component.scss']
})
export class CampoListComponent implements OnInit {
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  selectedEmpresa: number = 0;


  constructor(private empresaService: EmpresaService, private campoService: CampoService, private router: Router) {}

  ngOnInit() {
    this.loadEmpresas();
    this.loadCampos();
  }

  loadEmpresas() {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => console.error('Error al obtener empresas', error)
    });
  }

  loadCampos() {
    this.campoService.getCampos().subscribe({
      next: (response) => {
        if (response.success) {
          this.campos = response.data;  // Asegúrate de que esta asignación se está haciendo correctamente
        } else {
          console.error('No se pudieron cargar todos los campos');
          this.campos = [];
        }
      },
      error: (error) => {
        console.error('Error al cargar todos los campos', error);
        this.campos = [];
      }
    });
  }
  filterCampos() {
    if (this.selectedEmpresa>0) {
      this.campoService.getCamposByEmpresa(this.selectedEmpresa).subscribe({
        next: (campos) => {
          if (campos.success) {
            this.campos = campos.data;
          }else{
            console.log('No hay campos disponibles para esta empresa.'); // O muestra algún mensaje en la UI
          }
        },
        error: (error) => {
          console.error('Error al obtener campos', error);
          this.campos = [];
        }
      });
    } else {
      this.loadCampos(); // Esto recargará todos los campos solo si no hay una empresa seleccionada
    }
  }

  nuevoCampo() {
    this.router.navigate(['/campos/nuevo']);
  }

  editarCampo(id: number, campo: Campo) {
    this.router.navigate(['campos/editar/', id]);  
  }

  softDeleteCampo(id: number){
    this.campoService.deleteCampo(id).subscribe({
      next: () => {
        console.log('Campo eliminado');
        this.loadCampos();  // Recargar la lista para reflejar los cambios
      },
      error: (error) => console.error('Error al eliminar campo', error)
    });
  }
}
