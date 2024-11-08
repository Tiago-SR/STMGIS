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
  empresa: Empresa = new Empresa();

  constructor(
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadEmpresa(id);
    }
  }

  loadEmpresa(id: string) {
    this.empresaService.getEmpresaById(id).subscribe({
      next: (empresa) => this.empresa = empresa,
      error: (err) => console.error('Error al cargar empresa', err)
    });
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      if (this.empresa.rut && this.empresa.rut.length > 12) {
        console.error('El RUT no puede tener más de 12 dígitos');
        return;
      }
      this.empresaService.updateEmpresa(this.empresa.id!, this.empresa).subscribe({
        next: (res) => {
          console.log('Empresa actualizada:', res);
          this.router.navigate(['/empresas']);
        },
        error: (err) => console.error('Error al actualizar empresa:', err)
      });
    }
  }
}
