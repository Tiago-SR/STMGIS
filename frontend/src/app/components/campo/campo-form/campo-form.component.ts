import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CampoService } from '../../../services/campo.service';
import { EmpresaService } from '../../../services/empresa.service';
import { Router } from '@angular/router';
import { Empresa } from '../../../models/empresa.model';
import { Campo } from '../../../models/campo.model';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-campo-form',
  templateUrl: './campo-form.component.html',
  styleUrls: ['./campo-form.component.scss']
})
export class CampoFormComponent implements OnInit {
  empresas: Empresa[] = [];
  campo!: Campo;
  selectedFiles: {[key: string]: File | null} = {};
  departamentos: string[] = [
    'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida',
    'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera',
    'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'
  ].sort(); 
  campoForm!: FormGroup;

  constructor(
    private campoService: CampoService,
    private empresaService: EmpresaService,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
    this.campoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      superficie: [0, [Validators.required, Validators.min(0)]],
      empresa: [null, [Validators.required]],
      departamento: [null, [Validators.required]],
      dbfFile: [null, [Validators.required]],
      shpFile: [null, [Validators.required]],
      shxFile: [null, [Validators.required]]
    });
  }


  loadEmpresas() {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        console.log('adsasdasda', empresas);
        
        this.empresas = empresas;
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
        this.toastr.error('Error al cargar empresas', 'Error');
      }
    });
  }
  handleFileInput(event: any, fileType: string): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles[fileType] = files.item(0);
    }
  }

 
  // Enviar los datos del formulario
  onSubmit() {
    if (this.campoForm.valid) {
      const formData = new FormData();

      // Añadir los datos del campo al formData
      formData.append('nombre', this.campoForm.get('nombre')?.value);
      formData.append('superficie', this.campoForm.get('superficie')?.value);
      formData.append('departamento', this.campoForm.get('departamento')?.value);
      formData.append('empresa', this.campoForm.get('empresa')?.value);
      formData.append('is_active', 'true');

      
      if (this.selectedFiles['shpFile']) {
        formData.append('shpFile', this.selectedFiles['shpFile']);
      }
      if (this.selectedFiles['shxFile']) {
        formData.append('shxFile', this.selectedFiles['shxFile']);
      }
      if (this.selectedFiles['dbfFile']) {
        formData.append('dbfFile', this.selectedFiles['dbfFile']);
      }

   
      this.campoService.createCampo(formData).subscribe({
        next: (res) => {
          console.log('Campo registrado:', res);         
          this.router.navigate(['/campos'], {
            state: { message: 'Campo actualizado con éxito', type: 'success' }
          });
        },
        error: (err) => {
          console.error('Error al registrar el campo:', err);
          this.toastr.error('Error al registrar el campo', err);
        }
      });
    }
  }
  get isFormValid() {
    return this.campoForm.valid && this.selectedFiles['shpFile'] && this.selectedFiles['shxFile'] && this.selectedFiles['dbfFile'];
  }
}
