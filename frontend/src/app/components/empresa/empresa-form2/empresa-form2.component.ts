import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empresa-form2',
  templateUrl: './empresa-form2.component.html',
  styleUrls: ['./empresa-form2.component.scss']
})
export class EmpresaForm2Component {
  
  empresa: Empresa = new Empresa();  

  constructor(private empresaService: EmpresaService, private router: Router) {
  
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.empresaService.createEmpresa(this.empresa).subscribe({
        next: (res) => {
          console.log('Empresa creada:', res);
          this.router.navigate(['/empresas']); // Redirigir después del registro

        },
        error: (err) => console.error('Error al crear empresa:', err)
      });
    }
  }
}
