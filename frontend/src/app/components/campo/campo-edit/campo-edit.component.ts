import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { CampoService } from '../../../services/campo.service';
import { EmpresaService } from '../../../services/empresa.service';
import { Campo } from '../../../models/campo.model';
import { Empresa } from '../../../models/empresa.model';

@Component({
  selector: 'app-campo-edit',
  templateUrl: './campo-edit.component.html',
  styleUrls: ['./campo-edit.component.scss']
})
export class CampoEditComponent implements OnInit {
  campo: Campo = new Campo(); // Asegúrate de que Campo incluya 'empresaId'
  empresa: Empresa = new Empresa();
  empresaNombre: string = '';

  constructor(
    private campoService: CampoService,
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadCampo(id);
    }
  }

  loadCampo(id: number) {
    this.campoService.getCampoById(id).subscribe({
      next: (campo) => {
        this.campo = campo;
        if (campo.empresa) {
          this.loadEmpresa(campo.empresa);
        } else {
          console.error('Empresa ID no definido para el campo');
        }     
      },
      error: (err) => console.error('Error al cargar campo:', err)
    });
  }

  loadEmpresa(empresaId: number) {
    this.empresaService.getEmpresaById(empresaId).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
        this.empresaNombre = empresa.nombre;
      },
      error: (err) => console.error('Error al cargar empresa:', err)
    });
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.campoService.updateCampo(this.campo.id!, this.campo).subscribe({
        next: (res) => {
          console.log('Campo actualizado:', res);          
          this.router.navigate(['/campos']); // Ajusta la ruta según necesidad
        },
        error: (err) => console.error('Error al actualizar campo:', err)
      });
    }
  }
}
