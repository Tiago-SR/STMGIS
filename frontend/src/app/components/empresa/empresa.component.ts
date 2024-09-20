import { Component } from '@angular/core';
import { Empresa } from '../../models/empresa.model';
import { EmpresaService } from '../../services/empresa.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-empresa',
  templateUrl: './empresa.component.html',
  styleUrls: ['./empresa.component.scss']
})
export class EmpresaComponent {

  empresa: Empresa = new Empresa();  

  constructor(private empresaService: EmpresaService) {}

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
