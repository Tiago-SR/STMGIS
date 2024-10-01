import { Component, OnInit } from '@angular/core';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpresaService } from '../../../services/empresa.service';
import { Empresa } from '../../../models/empresa.model';
import { forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-data-user',
  templateUrl: './data-user.component.html',
  styleUrl: './data-user.component.scss'
})
export class DataUserComponent implements OnInit {

  user!: any;
  userStatus = new FormControl(false);
  empresasUser: Empresa[] = [];
  empresasAll: Empresa[] = [];
  formSubmitted = false;

  private draggedElement: any = null;
  elementClicked: { el: null | HTMLElement, left: boolean } = { el: null, left: false };

  constructor(private userService: UsuarioService, private empresaService: EmpresaService, private toast: ToastrService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      if (!id) this.toast.error('Usuario no encontrado', '', { positionClass: 'toast-top-center' });
      else this.searchInfo(id);
    })
  }

  searchInfo(userId: string) {
    const userData$ = this.userService.getUser(userId);
    const empresasData$ = this.empresaService.getAllEmpresas();
    forkJoin([userData$, empresasData$]).subscribe({
      next: ([userData, empresasData]) => {
        this.user = userData;
        this.empresasUser = userData.empresas;
        this.empresasAll = empresasData.filter((empresa: Empresa) => !this.empresasUser.some((empresaUser: Empresa) => empresaUser.id === empresa.id));
        this.userStatus.setValue(this.user.is_active);
      },
      error: (error) => {
        this.toast.error('Error al cargar la información', '', { positionClass: 'toast-top-center' });
      }
    })
  }

  handleDragStart(ev: any, empresa: Empresa, side: string) {
    this.draggedElement = empresa; // Guarda el objeto empresa
    this.selectedEmpresasLeft = [];
    this.selectedEmpresasRight = [];
  }

  handleDragEnd(ev: any) {
    this.draggedElement = null;
  }

  handleDrop(ev: any, side: string) {
    ev.preventDefault();
  
    if (!this.draggedElement) return;
  
    if (side === 'left') {
      // Mover de disponibles a asignadas
      const index = this.empresasAll.indexOf(this.draggedElement);
      if (index > -1) {
        this.empresasAll.splice(index, 1); // Eliminar de empresas disponibles
        this.empresasUser.push(this.draggedElement); // Añadir a empresas asignadas
      }
    } else if (side === 'right') {
      // Mover de asignadas a disponibles
      const index = this.empresasUser.indexOf(this.draggedElement);
      if (index > -1) {
        this.empresasUser.splice(index, 1); // Eliminar de empresas asignadas
        this.empresasAll.push(this.draggedElement); // Añadir a empresas disponibles
      }
    }
  
    this.draggedElement = null;
  
    // Limpiar las selecciones
    this.selectedEmpresasLeft = [];
    this.selectedEmpresasRight = [];
  }
  handleDragOver(ev: any) {
    ev.preventDefault();
  }

  handleDragLeave(ev: any) {
    ev.preventDefault();
  }

  onClickEmpresaList(ev: any) {
    const actual = this.elementClicked.el;
    if (actual) actual.classList.remove('selected');
    this.elementClicked.el = ev.target;
    ev.target.classList.add('selected');
    const idElementEmpresa = ev.target.dataset.ide;
    this.elementClicked.left = this.empresasUser.find((e: Empresa) => e.id === idElementEmpresa) ? true : false;
  }

  onSubmit() {
    this.formSubmitted = true;
    const datosToSend = {
      is_active: this.userStatus.value,
      empresas: Array.from(document.querySelectorAll("ul[data-tipo='left'] li")).map((el: any) => el.dataset.ide)
    }

    this.userService.updateUser(this.user.id, datosToSend).subscribe({
      next: (data) => {
        console.log(data);
        this.formSubmitted = false;
        this.toast.success('Usuario actualizado', '');
      },
      error: (error) => {
        console.log(error);
        this.formSubmitted = false;
        this.toast.error('Error al actualizar el usuario', '');
      }
    })

  }
  selectedEmpresasLeft: any[] = []; // Para las empresas seleccionadas en la lista izquierda
  selectedEmpresasRight: any[] = []; // Para las empresas seleccionadas en la lista derecha

  // Función para seleccionar una empresa
  selectEmpresa(empresa: any, side: string) {
    if (side === 'left') {
      // Seleccionar/deseleccionar en la lista izquierda
      const index = this.selectedEmpresasLeft.indexOf(empresa);
      if (index > -1) {
        this.selectedEmpresasLeft.splice(index, 1);  // Deseleccionar
      } else {
        this.selectedEmpresasLeft.push(empresa);  // Seleccionar
      }
    } else if (side === 'right') {
      // Seleccionar/deseleccionar en la lista derecha
      const index = this.selectedEmpresasRight.indexOf(empresa);
      if (index > -1) {
        this.selectedEmpresasRight.splice(index, 1);  // Deseleccionar
      } else {
        this.selectedEmpresasRight.push(empresa);  // Seleccionar
      }
    }
  }

  // Mover empresas seleccionadas de la izquierda (asignadas) a la derecha (disponibles)
  moveRight() {
    this.selectedEmpresasLeft.forEach(empresa => {
      const index = this.empresasUser.indexOf(empresa);
      if (index > -1) {
        this.empresasUser.splice(index, 1);  // Eliminar de la lista izquierda
        this.empresasAll.push(empresa);  // Añadir a la lista derecha
      }
    });
    this.selectedEmpresasLeft = [];  // Limpiar selección después de mover
  }

  // Mover empresas seleccionadas de la derecha (disponibles) a la izquierda (asignadas)
  moveLeft() {
    this.selectedEmpresasRight.forEach(empresa => {
      const index = this.empresasAll.indexOf(empresa);
      if (index > -1) {
        this.empresasAll.splice(index, 1);  // Eliminar de la lista derecha
        this.empresasUser.push(empresa);  // Añadir a la lista izquierda
      }
    });
    this.selectedEmpresasRight = [];  // Limpiar selección después de mover
  }
}
