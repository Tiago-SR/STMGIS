import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { ConfirmationService } from '../../services/confirmation.service';
import { PaginatedResponse } from '../../models/paginated-response.model';

@Component({
  selector: 'app-normalizar-mapas',
  templateUrl: './normalizar-mapas.component.html',
  styleUrls: ['./normalizar-mapas.component.scss']
})
export class NormalizarMapasComponent implements OnInit, OnDestroy {
  private websocketSubscription: Subscription | null = null;
  isConnecting = false;

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
    private webSocketService: WebSocketService,
    private confirmationService: ConfirmationService
  ) {
    this.cultivoForm = this.fb.group({
      cultivo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarEspecies();
  }

  ngOnDestroy(): void {
    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
    }
    this.webSocketService.disconnect();
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
    this.cd.detectChanges();
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

  seleccionarCultivo() {
    if (this.cultivoForm.invalid) {
      this.toastr.warning('Por favor, selecciona un cultivo antes de continuar.', 'Formulario incompleto');
      return;
    }

    const cultivoId = this.cultivoForm.get('cultivo')?.value;

    if (!cultivoId) {
      this.toastr.error('No se seleccionó ningún cultivo. Intente nuevamente.', 'Error');
      return;
    }

    // Verificar si el cultivo ya está normalizado
    this.cultivoService.obtenerEstaNormalizado(cultivoId).subscribe(
      (response) => {
        if (response.all_normalized) {
          // Mostrar diálogo de confirmación
          console.log('mati debug todo normalizado');
          this.confirmationService
            .requestConfirmation(
              'Normalización Previa Encontrada',
              'Este cultivo ya ha sido normalizado previamente. ¿Desea realizar el proceso nuevamente?'
            )
            .then((confirmed) => {
              if (confirmed) {
                this.iniciarProcesoNormalizacion(cultivoId);
              } else {
                this.toastr.info('El proceso de normalización no se ha iniciado.', 'Información');
              }
            });
        } else {
          // No está normalizado, iniciar proceso directamente
          this.iniciarProcesoNormalizacion(cultivoId);
        }
      },
      (error) => {
        console.error('Error al verificar si el cultivo está normalizado:', error);
        this.toastr.error('Error al verificar el estado de normalización', 'Error');
      }
    );
  }

  private iniciarProcesoNormalizacion(cultivoId: string) {
    // Activar el spinner de carga
    this.isConnecting = true;

    // Desconectar websocket existente si hay uno
    this.webSocketService.disconnect();
    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
    }

    // Conectar al WebSocket
    this.webSocketService.connect(cultivoId);

    // Suscribirse a los mensajes del WebSocket
    this.websocketSubscription = this.webSocketService.getMessages().subscribe(
      (data) => {
        console.log('Mensaje recibido del WebSocket:', data);

        if (data.action === 'nuevos_mapas') {
          // Navegar a la página de normalización cuando se reciban los primeros mapas
          this.isConnecting = false;
          this.router.navigate(['/normalizar-mapas-rendimiento', cultivoId]);
        } 
        else if (data.action === 'proceso_completado') {
          this.isConnecting = false;
          this.toastr.success('La normalización de mapas de rendimiento ha sido completada.', 'Éxito');
          this.router.navigate([`/resultado-normalizacion/${cultivoId}`]);
        } 
        else if (data.action === 'error') {
          this.isConnecting = false;
          this.toastr.error(data.message, 'Error');
          console.error('Error desde el backend:', data.message);
        }
      },
      error => {
        this.isConnecting = false;
        console.error('Error al recibir mensajes del WebSocket:', error);
        this.toastr.error('Error en la conexión WebSocket', 'Error');
      }
    );

    // Iniciar el proceso cuando el WebSocket esté abierto
    this.webSocketService.onOpen().subscribe(() => {
      console.log('WebSocket está abierto, enviando mensaje iniciar_proceso');
      this.webSocketService.sendMessage({ action: 'iniciar_proceso' });
    });
  }
}
