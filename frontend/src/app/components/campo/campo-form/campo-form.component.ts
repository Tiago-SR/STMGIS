import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CampoService } from '../../../services/campo.service';
import { EmpresaService } from '../../../services/empresa.service';
import { Router } from '@angular/router';
import { Empresa } from '../../../models/empresa.model';
import { Campo } from '../../../models/campo.model';


@Component({
  selector: 'app-campo-form',
  templateUrl: './campo-form.component.html',
  styleUrls: ['./campo-form.component.scss']
})
export class CampoFormComponent implements OnInit {
  empresas: Empresa[] = [];
  campo: Campo = new Campo();
  selectedFiles: {[key: string]: File | null} = {};


  constructor(
    private campoService: CampoService,
    private empresaService: EmpresaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
  }

  // Cargar las empresas para el combo box
  loadEmpresas() {
    this.empresaService.getAllEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
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
  onSubmit(form: NgForm) {
    if (form.valid) {
      const formData = new FormData();

      // Añadir los datos del campo al formData
      formData.append('nombre', this.campo.nombre);
      formData.append('superficie', this.campo.superficie.toString());
      formData.append('departamento', this.campo.departamento);
      formData.append('empresa', this.campo.empresaId.toString());
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

      // Enviar los datos al servicio
      this.campoService.createCampo(formData).subscribe({
        next: (res) => {
          console.log('Campo registrado:', res);
          this.router.navigate(['/campos']); // Redirigir después del registro
        },
        error: (err) => {
          console.error('Error al registrar el campo:', err);
        }
      });
    }
  }
}
