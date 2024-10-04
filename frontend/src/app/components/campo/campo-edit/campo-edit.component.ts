import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { CampoService } from '../../../services/campo.service';
import { EmpresaService } from '../../../services/empresa.service';
import { Campo } from '../../../models/campo.model';
import { Empresa } from '../../../models/empresa.model';
import { ToastrService } from 'ngx-toastr';
import { setThrowInvalidWriteToSignalError } from '@angular/core/primitives/signals';

@Component({
  selector: 'app-campo-edit',
  templateUrl: './campo-edit.component.html',
  styleUrls: ['./campo-edit.component.scss']
})
export class CampoEditComponent implements OnInit {
  campo!: Campo; // Asegúrate de que Campo incluya 'empresaId'
  empresa: Empresa = new Empresa();
  empresaNombre: string = '';
  campoForm!: FormGroup;
  departamentos: string[] = [
    'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida',
    'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera',
    'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'
  ].sort(); 

  constructor(
    private campoService: CampoService,
    private empresaService: EmpresaService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadCampo(id);
    }
    this.campoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      superficie: [0, [Validators.required, Validators.min(0)]],
      departamento: [null, [Validators.required]],
    });
  }

  loadCampo(id: string) {
    this.campoService.getCampoById(id).subscribe({
      next: (campo) => {
        this.campo = campo;
        if (campo.empresa) {
          this.loadEmpresa(campo.empresa);
          this.campoForm.patchValue({
            nombre: campo.nombre,
            superficie: campo.superficie,
            departamento: campo.departamento
          })
        } else {
          console.error('Empresa ID no definido para el campo');
          this.toastr.error('Error', 'Empresa ID no definido para el campo');
        }
      },
      error: (err) => console.error('Error al cargar campo:', err)
    });
  }

  loadEmpresa(empresaId: string) {
    this.empresaService.getEmpresaById(empresaId).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
        this.empresaNombre = empresa.nombre;
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err),
          this.toastr.error('Error al cargar la empresa', 'Error');
      }
    });
  }

  onSubmit() {
    if (this.campoForm.valid) {
      this.campo = {
        ...this.campo,
        ...this.campoForm.value
      };
      this.campoService.updateCampo(this.campo.id!, this.campo).subscribe({
        next: (res) => {
          console.log('Campo actualizado:', res);
          this.toastr.success('Exito', 'Campo actualizado');
          this.router.navigate(['/campos'], {
            state: { message: 'Campo actualizado con éxito', type: 'success' }
          });
        },
        error: (err) => {
          console.error('Error al actualizar campo:', err);
          this.toastr.error('Error al actualizar campo', err);
        }

      });
    } else {
      this.toastr.error('Error', 'Formulario inválido');
    }
  }
}
