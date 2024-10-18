import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Empresa } from '../../models/empresa.model';
import { Campo } from '../../models/campo.model';
import { Especie } from '../../models/especie.model';
import Cultivo from '../../models/cultivo.model';
import { EmpresaService } from '../../services/empresa.service';
import { CampoService } from '../../services/campo.service';
import { CultivoService } from '../../services/cultivo.service';
import { EspecieService } from '../../services/especie.service';
import { GestionService } from '../../services/gestion.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { WebSocketService } from '../../services/web-socket.service';

@Component({
  selector: 'app-normalizar-mapas',
  templateUrl: './normalizar-mapas.component.html',
  styleUrls: ['./normalizar-mapas.component.scss']
})
export class NormalizarMapasComponent implements OnInit {
  empresas: Empresa[] = [];
  campos: Campo[] = [];
  especies: Especie[] = [];
  gestiones: any[] = [];
  cultivos: Cultivo[] = [];
  cultivosTodos: Cultivo[] = [];

  empresaSeleccionadaId: number | null = null;
  campoSeleccionadoId: number | null = null;
  especieSeleccionadaId: string | null = null;
  gestionSeleccionadaId: string | null = null;

  cultivoForm: FormGroup;

  mapaReferencia: any;  
  mapaActual: any; 

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private campoService: CampoService,
    private cultivoService: CultivoService,
    private especieService: EspecieService,
    private gestionService: GestionService,
    private cd: ChangeDetectorRef,
    private toastr: ToastrService,
    private router: Router,
    private webSocketService: WebSocketService // Servicio WebSocket

  ) {
    this.cultivoForm = this.fb.group({
      cultivo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarEspecies();

     // Escuchar mensajes del WebSocket
     this.webSocketService.getMessages().subscribe(
      (data) => {
        console.log('Mensaje recibido del WebSocket:', data);

        if (data.action === 'nuevos_mapas') {
          // Lógica para manejar los mapas
          this.mapaReferencia = data.mapa_referencia;
          this.mapaActual = data.mapa_actual;

          // Forzar la detección de cambios
          this.router.navigate([`/normalizar-mapas-rendimiento/${this.cultivoForm.get('cultivo')?.value}`]);
        }

        if (data.action === 'proceso_completado') {
          this.toastr.success('La normalización de mapas de rendimiento ha sido completada.', 'Éxito');
          this.router.navigate([`/resultado-normalizacion/${this.cultivoForm.get('cultivo')?.value}`]);
        } else if (data.action === 'error') {
          this.toastr.error(data.message, 'Error');
          console.error('Error desde el backend:', data.message);
        }
      },
      error => {
        console.error('Error al recibir mensajes del WebSocket:', error);
      }
    );
      
  }

  cargarEmpresas() {
    this.empresaService.getAllEmpresas().subscribe(
      data => {
        this.empresas = data;
      },
      error => {
        console.error('Error al cargar las empresas', error);
      }
    );
  }

  onEmpresaChange() {
    if (this.empresaSeleccionadaId) {
      this.cargarCamposPorEmpresa(this.empresaSeleccionadaId);
      this.campoSeleccionadoId = null;
      this.cultivos = [];
      this.cultivosTodos = [];
      this.especieSeleccionadaId = null;
      this.gestionSeleccionadaId = null;
    } else {
      this.campos = [];
      this.cultivos = [];
      this.cultivosTodos = [];
    }
    this.filtrarCultivos();
  }

  cargarCamposPorEmpresa(empresaId: number) {
    this.campoService.getCamposByEmpresa(empresaId.toString()).subscribe(
      response => {
        this.campos = response.data;
        this.cd.detectChanges();
      },
      error => {
        this.toastr.error('Error al cargar los campos', 'Error');
        console.error('Error al cargar los campos', error);
      }
    );
  }

  onCampoChange() {
    this.especieSeleccionadaId = null;
    this.gestionSeleccionadaId = null;
    this.cargarGestiones();
    this.filtrarCultivos();
  }

  cargarGestiones() {
    if (this.campoSeleccionadoId) {
      this.gestionService.getAllGestiones().subscribe(
        gestiones => {
          this.gestiones = gestiones;
        },
        error => {
          console.error('Error al cargar las gestiones:', error);
          this.toastr.error('Error al cargar las gestiones', 'Error');
        }
      );
    } else {
      this.gestiones = [];
    }
  }

  cargarEspecies() {
    this.especieService.obtenerEspecies().subscribe(
      data => {
        this.especies = data;
      },
      error => {
        this.toastr.error('Error al cargar las especies', 'Error');
        console.error('Error al cargar las especies', error);
      }
    );
  }

  onEspecieChange() {
    this.gestionSeleccionadaId = null;
    this.filtrarCultivos();
  }

  onGestionChange() {
    this.filtrarCultivos();
  }

  filtrarCultivos() {
    const parametrosFiltro: any = {};
    if (this.campoSeleccionadoId) {
      parametrosFiltro['campo'] = this.campoSeleccionadoId;
    }
    if (this.gestionSeleccionadaId) {
      parametrosFiltro['gestion'] = this.gestionSeleccionadaId;
    }
    if (this.especieSeleccionadaId) {
      parametrosFiltro['especie'] = this.especieSeleccionadaId;
    }

    this.cultivoService.obtenerCultivos(parametrosFiltro).subscribe(
      data => {
        this.cultivosTodos = data;
        this.aplicarFiltroEspecie();
      },
      error => {
        this.toastr.error('Error al cargar los cultivos', 'Error');
        console.error('Error al cargar los cultivos', error);
      }
    );
  }

  aplicarFiltroEspecie() {
    if (this.especieSeleccionadaId) {
      this.cultivos = this.cultivosTodos.filter(cultivo => cultivo.especie === this.especieSeleccionadaId);
    } else {
      this.cultivos = [...this.cultivosTodos];
    }

    if (this.cultivos.length === 0) {
      this.cultivoForm.get('cultivo')?.setErrors({ noCultivos: true });
    } else {
      this.cultivoForm.get('cultivo')?.setErrors(null);
    }
  }
/*
  seleccionarCultivo() {
    if (this.cultivoForm.invalid) {
      this.toastr.warning('Por favor, selecciona un cultivo antes de continuar.', 'Formulario incompleto');
      return;
    }

    const cultivoId = this.cultivoForm.get('cultivo')?.value;
    console.log('Cultivo seleccionado:', cultivoId);

    // Llamar al servicio para normalizar los mapas de rendimiento
    this.cultivoService.normalizarMapas(cultivoId).subscribe(
      response => {
        console.log('Normalización completada:', response);
        this.toastr.success('La normalización de mapas de rendimiento ha sido completada.', 'Éxito');
        // Redirigir o actualizar la vista con los resultados de la normalización
        this.router.navigate([`/resultado-normalizacion/${cultivoId}`]);
        
      },
      error => {
        this.toastr.error('Error al normalizar los mapas de rendimiento', 'Error');
        console.error('Error al normalizar los mapas de rendimiento:', error);
      }
    );
  }
*/
  seleccionarCultivo() {
    if (this.cultivoForm.invalid) {
      this.toastr.warning('Por favor, selecciona un cultivo antes de continuar.', 'Formulario incompleto');
      return;
    }

    const cultivoId = this.cultivoForm.get('cultivo')?.value;
    console.log('Cultivo seleccionado:', cultivoId);

    // Conectar al WebSocket y enviar el mensaje para iniciar el proceso
    this.webSocketService.connect(cultivoId);
    this.webSocketService.onOpen().subscribe(() => {
      console.log('WebSocket está abierto, enviando mensaje iniciar_proceso');
      this.webSocketService.sendMessage({ action: 'iniciar_proceso' });
    });

    // Escuchar mensajes del WebSocket
    this.webSocketService.getMessages().subscribe(
      (data) => {
        console.log('Mensaje recibido del WebSocket:', data);

        
        if (data.action === 'proceso_completado') {
          this.toastr.success('La normalización de mapas de rendimiento ha sido completada.', 'Éxito');
          // Redirigir o actualizar la vista con los resultados de la normalización
          this.router.navigate([`/resultado-normalizacion/${cultivoId}`]);
        } else if (data.action === 'error') {
          this.toastr.error(data.message, 'Error');
          console.error('Error desde el backend:', data.message);
        }
      },
      error => {
        console.error('Error al recibir mensajes del WebSocket:', error);
      }
    );
  }
}
