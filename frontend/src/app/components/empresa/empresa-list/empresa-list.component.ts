
import { Router } from '@angular/router';
import { Empresa } from '../../../models/empresa.model';
import { EmpresaService } from '../../../services/empresa.service';
import { Component, OnInit } from '@angular/core';
import { ConfirmationService } from "../../../services/confirmation.service";

@Component({
  selector: 'app-empresa-list',
  templateUrl: './empresa-list.component.html',
  styleUrls: ['./empresa-list.component.scss']
})
export class EmpresaListComponent implements OnInit {
  empresas: Empresa[] = [];
  cargando = false;
  totalItems = 0;
  currentPage = 1;
  pageSize = 20;
  
  constructor(
    private empresaService: EmpresaService,
    private router: Router,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.cargando = true;
    const params = {
      page: this.currentPage,
      page_size: this.pageSize
    };
  
    this.empresaService.getEmpresasPaginadas(params).subscribe({
      next: (data) => {
        this.empresas = data.results;
        this.totalItems = data.count;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener empresas', error);
        this.cargando = false;
      }
    });
  }
  

  editarEmpresa(id: number, empresa: Empresa) { 
    this.router.navigate(['/editar-empresa', id]);
  }

  softDeleteEmpresa(id: number) {
    this.confirmationService.requestConfirmation(
      'Eliminar Empresa',
      '¿Estás seguro de que deseas eliminar esta empresa?'
    ).then((confirmed) => {
      if (confirmed) {
        this.cargando = true;
        this.empresaService.deleteEmpresa(id).subscribe({
          next: () => {
            this.loadEmpresas();
          },
          error: (err) => {
            console.error('Error al eliminar empresa:', err);
            this.cargando = false;
          }
        });
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadEmpresas();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEmpresas();
    }
  }
  
}