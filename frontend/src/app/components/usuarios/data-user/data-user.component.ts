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

  private draggedElement = null;
  private sourceContainer = null;
  elementClicked = { el: null, left: false};
  
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

  handleDragStart(ev: any) {
    this.draggedElement = ev.target;
    this.sourceContainer = ev.target.parentElement;
  }

  handleDragEnd(ev: any) {
    this.draggedElement = null;
    this.sourceContainer = null;
  }

  handleDrop(ev: any) {
    ev.preventDefault();
    const { currentTarget } = ev;
    if (this.draggedElement) {
      currentTarget.appendChild(this.draggedElement);
    }
    currentTarget.classList.remove('drag-over');
  }

  handleDragOver(ev: any) {
    ev.preventDefault();
    const { currentTarget } = ev;
    if (this.sourceContainer === currentTarget) return
    currentTarget.classList.add('drag-over');
  }

  handleDragLeave(ev: any) {
    ev.preventDefault();
    const { currentTarget } = ev;
    currentTarget.classList.remove('drag-over');
  }

  onClickEmpresaList(ev: any) {
    this.elementClicked.el = ev.target;
    const idElementEmpresa = ev.target.dataset.ide;    
    this.elementClicked.left = this.empresasUser.find((e: Empresa) => e.id === idElementEmpresa) ? true : false;
  }

  onSubmit() {
    console.log('Submit');
    console.log(this.userStatus.value);
    const datosToSend = {
      is_active: this.userStatus.value
    }

    this.userService.updateUser(this.user.id, datosToSend).subscribe({
      next: (data) => {
        console.log(data);
        
        this.toast.success('Usuario actualizado', '');
      },
      error: (error) => {
        console.log(error);
        
        this.toast.error('Error al actualizar el usuario', '' );
      }
    })
    
  }

}
