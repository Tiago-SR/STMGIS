import { Component, OnInit } from '@angular/core';
import { Empresa } from '../../models/empresa.model';
import { EmpresaService } from '../../services/empresa.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empresa-list',
  templateUrl: './empresa-list.component.html',
  styleUrl: './empresa-list.component.scss'
})
export class EmpresaListComponent implements OnInit {
  empresas: Empresa[] = [];

  constructor(private empresaService: EmpresaService, private router: Router) {}

  ngOnInit() {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => console.error('Error al obtener empresas', error)
    });
  } 
  loadEmpresas() {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => this.empresas = empresas,
      error: (error) => console.error('Error al obtener empresas', error)
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
    this.empresaService.deleteEmpresa(id).subscribe({
      next: () => {
        console.log('Empresa eliminada (soft delete).');
        this.loadEmpresas();  // Recargar la lista para reflejar el cambio
      },
      error: (err) => console.error('Error al eliminar empresa:', err)
    });
  }
}
