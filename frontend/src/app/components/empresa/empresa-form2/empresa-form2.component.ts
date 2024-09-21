import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';

@Component({
  selector: 'app-empresa-form2',
  templateUrl: './empresa-form2.component.html',
  styleUrls: ['./empresa-form2.component.scss']
})
export class EmpresaForm2Component {
  
  empresa: Empresa = new Empresa();  

  constructor(private empresaService: EmpresaService) {
    empresaService.getEmpresaById(1).subscribe({
      next: (empresa) => {
        this.empresa = empresa
      },
      error: (err) => {
        alert(`Ha ocurrido un error`)
        console.log(`Ha ocurrido un error,`, err);
      }
    })
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.empresaService.createEmpresa(this.empresa).subscribe({
        next: (res) => {
          console.log('Empresa creada:', res);
          form.reset();
        },
        error: (err) => console.error('Error al crear empresa:', err)
      });
    }
  }
}
