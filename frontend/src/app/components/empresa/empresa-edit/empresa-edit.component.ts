import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';

@Component({
  selector: 'app-empresa-edit',
  templateUrl: './empresa-edit.component.html',
  styleUrls: ['./empresa-edit.component.scss']
})
export class EmpresaEditComponent implements OnInit {
  empresa: Empresa = new Empresa();  // Asegúrate de que este modelo tiene el formato adecuado

  constructor(
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Captura el ID desde la URL
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadEmpresa(id);
    }
  }

  loadEmpresa(id: number) {
    this.empresaService.getEmpresaById(id).subscribe({
      next: (empresa) => this.empresa = empresa,
      error: (err) => console.error('Error al cargar empresa', err)
    });
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.empresaService.updateEmpresa(this.empresa.id!, this.empresa).subscribe({
        next: (res) => {
          console.log('Empresa actualizada:', res);
          this.router.navigate(['/empresas']);  // Ajusta la ruta según necesidad
        },
        error: (err) => console.error('Error al actualizar empresa:', err)
      });
    }
  }
}
