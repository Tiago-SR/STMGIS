import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Empresa } from '../../../models/empresa.model';
import { EmpresaService } from '../../../services/empresa.service';

@Component({
  selector: 'app-empresa-list',
  templateUrl: './empresa-list.component.html',
  styleUrls: ['./empresa-list.component.scss']
})
export class EmpresaListComponent implements OnInit {
  empresas: Empresa[] = [];
  cargando = false;

  constructor(private empresaService: EmpresaService, private router: Router) {}

  ngOnInit() {
    this.loadEmpresas();
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
        this.cargando = false;
      }
    });
  }

  editarEmpresa(id: number, empresa: Empresa) { 
    this.router.navigate(['/editar-empresa', id]);
  }

  softDeleteEmpresa(id: number) {
    if (id === undefined) {
      console.error('Error: El ID de la empresa no está definido.');
      return;
    }
    this.cargando = true;
    this.empresaService.deleteEmpresa(id).subscribe({
      next: () => {
        console.log('Empresa eliminada (soft delete).');
        this.loadEmpresas();
      },
      error: (err) => {
        console.error('Error al eliminar empresa:', err);
        this.cargando = false;
      }
    });
  }
}
