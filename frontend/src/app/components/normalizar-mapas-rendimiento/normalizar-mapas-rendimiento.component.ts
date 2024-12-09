import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import { WebSocketService } from '../../services/web-socket.service';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';


@Component({
  selector: 'app-normalizar-mapas-rendimiento',
  templateUrl: './normalizar-mapas-rendimiento.component.html',
  styleUrls: ['./normalizar-mapas-rendimiento.component.scss']
})
export class NormalizarMapasRendimientoComponent implements OnInit {
  private connectionStatus$ = this.webSocketService.getConnectionStatus();
  private isPopupEventListenerAdded = false;
  isLoading: boolean = true;
  reseteable: boolean = false;
  cultivo: any;
  mapaReferencia: any;
  mapaActual: any;
  nombreMapaReferencia: string = '';
  nombreMapaActual: string = '';
  coeficienteAjusteReferencia: number = 1;
  coeficienteAjusteActual: number = 1;
  coeficienteSugeridoReferencia: number = 1;
  coeficienteSugeridoActual: number = 1;
  percentil80Referencia: number = 0;
  percentil80Actual: number = 0;
  medianaReferencia: number = 0;
  medianaActual: number = 0;
  coeficienteSugeridoMedianas: number = 0;
  coeficienteSugeridoMedianaReferencia: number = 1;
  puntosReferencia: number = 0;
  puntosActual: number = 0;
  diferenciaPorcentual: number = 0;
  variacionAdmitida: number = 0;
  modoManual: boolean = true;
  cultivoId!: string;
  map!: Map;
  view!: MapView;

  posicion1Value: number | null = null;
  posicion2Value: number | null = null;

  constructor(
    private toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private webSocketService: WebSocketService
  ) {
    this.connectionStatus$.subscribe(isConnected => {
    });
  }

  ngOnInit(): void {

    this.cultivoId = this.route.snapshot.params['cultivoId'];
    this.initMap();
    if (this.cultivoId) {
      this.webSocketService.connect(this.cultivoId);

      this.webSocketService.onOpen().subscribe(() => {
        this.webSocketService.sendMessage({ action: 'iniciar_proceso' });
      });
    } else {
      console.error('Error: cultivoId no está definido');
    }

    this.webSocketService.getMessages().subscribe((data) => {
      this.isLoading = false;
      if (data.action === 'nuevos_mapas') {
        this.isLoading = true;
        this.mapaReferencia = data.mapa_referencia;
        this.mapaActual = data.mapa_actual;
        this.coeficienteSugeridoReferencia = data.coeficiente_sugerido_referencia;
        this.coeficienteSugeridoActual = data.coeficiente_sugerido_actual;
        this.coeficienteAjusteReferencia = parseFloat(data.coeficiente_sugerido_referencia.toFixed(3));
        this.coeficienteAjusteActual = parseFloat(data.coeficiente_sugerido_actual.toFixed(3));
        this.percentil80Referencia = data.percentil_80_referencia;
        this.percentil80Actual = data.percentil_80_actual;
        this.medianaReferencia = data.percentil_50_referencia;
        this.medianaActual = data.percentil_50_actual;
        this.coeficienteSugeridoMedianas = data.coeficiente_sugerido_median;
        this.coeficienteSugeridoMedianaReferencia = data.coeficiente_sugerido_median_referencia;
        this.puntosReferencia = data.puntos_referencia;
        this.puntosActual = data.puntos_actual;
        this.diferenciaPorcentual = data.diferencia_porcentual;
        this.variacionAdmitida = data.variacion_admitida;
        this.modoManual = data.modo_manual;
        this.nombreMapaReferencia = `Mapa Referencia (Acumulado)`;
        this.nombreMapaActual = `Mapa Actual ${data.current_pair_index + 2}`;
        this.addNormalizedMapLayer();
        this.cd.detectChanges();
        this.limitarDecimales();

      } else if (data.action === 'normalizacion_automatica') {
        this.toastr.success(
          `Se realizó la normalización automática ya que la diferencia
            está dentro de la variación admitida (${this.variacionAdmitida}%)
            Coeficiente aplicado: ${data.coeficiente_aplicado.toFixed(3)}`,
          'Normalización Automática',
          {
            timeOut: 5000,
            progressBar: true,
            closeButton: true,
            enableHtml: true
          }
        );
        this.cd.detectChanges();

      } else if (data.action === 'mapa_actualizado') {
        this.mapaActual = data.mapa_actual;
        if (data.puntos_actual) {
          this.puntosActual = data.puntos_actual;
        }
        this.addNormalizedMapLayer();
        this.cd.detectChanges();
      } else if (data.action === 'proceso_completado') {
        this.isLoading = false;
        this.toastr.info('Se han procesado todos los mapas', 'Proceso completo');
        this.router.navigate(['/resultado-normalizacion']);
      } else if (data.action === 'proceso_cancelado') {
        this.toastr.info('El proceso ha sido cancelado', 'Proceso cancelado');
        this.router.navigate(['/ruta-inicial']);
      } else if (data.action === 'mapa-unico') {
        this.toastr.info(data.message, 'Mapa único');
        this.isLoading = false;
      } else if (data.action === 'error') {
        this.toastr.error(data.message, 'Error');
        this.isLoading = false;
        console.error('Error desde el backend:', data.message);
      }
    });
  }


  initMap(): void {
    this.map = new Map({
      basemap: 'hybrid'
    });

    this.view = new MapView({
      container: 'viewDiv',
      map: this.map,
      center: [-56.0698, -32.4122],
      zoom: 8
    });

    const tipoSueloRenderer = new UniqueValueRenderer({
      field: 'IA',
      uniqueValueInfos: [
        {
          value: 1,
          symbol: new SimpleFillSymbol({
            color: [255, 0, 0, 0.3],
            outline: {
              color: [255, 0, 0],
              width: 1
            }
          }),
          label: 'IA 1'
        },
        {
          value: 2,
          symbol: new SimpleFillSymbol({
            color: [255, 255, 0, 0.3],
            outline: {
              color: [255, 255, 0],
              width: 1
            }
          }),
          label: 'IA 2'
        },
        {
          value: 3,
          symbol: new SimpleFillSymbol({
            color: [0, 255, 0, 0.3],
            outline: {
              color: [0, 255, 0],
              width: 1
            }
          }),
          label: 'IA 3'
        }
      ],
      defaultSymbol: new SimpleFillSymbol({
        color: [128, 128, 128, 0.3],
        outline: {
          color: [128, 128, 128],
          width: 1
        }
      }),
      defaultLabel: 'Otro tipo de suelo'
    });

    const geoJsonLayerIA = new GeoJSONLayer({
      url: `http://api.proyecto.local/geojson-por-cultivo/?cultivo_id=${this.cultivoId}`,
      title: 'Zonas de Rendimiento',
      outFields: ['*'],
      popupTemplate: {
        title: 'Ambiente: {ambiente}',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              { fieldName: 'name', label: 'Nombre' },
              { fieldName: 'area', label: 'Área (ha)', format: { digitSeparator: true, places: 2 } },
              { fieldName: 'ia', label: 'IA' },
              { fieldName: 'lote', label: 'Lote' },
              { fieldName: 'sist_prod', label: 'Sistema Productivo' },
              { fieldName: 'zona', label: 'Zona' },
              { fieldName: 'tipo_suelo', label: 'Tipo de Suelo' },
              { fieldName: 'posicion', label: 'Posición' },
              { fieldName: 'prof', label: 'Profundidad' },
              { fieldName: 'restriccion', label: 'Restricción' },
              { fieldName: 'ambiente', label: 'Ambiente' },
              { fieldName: 'idA', label: 'ID A' }
            ]
          }
        ]
      },
      renderer: tipoSueloRenderer
    });

    this.map.add(geoJsonLayerIA);

    geoJsonLayerIA.when(() => {
      geoJsonLayerIA.queryExtent().then((response) => {
        if (response.extent) {
          this.view.goTo(response.extent.expand(1.2));
        } else { }
      }).catch((error) => {
        console.error('Error al calcular el extent del GeoJSONLayer:', error);
      });
    }).catch((error) => {
      console.error('Error al cargar la capa de zonas de rendimiento GeoJSON:', error);
    });
  }

  addNormalizedMapLayer(): void {
    if (!this.map) {
      console.error('El mapa no está inicializado.');
      return;
    }

    this.map.layers.forEach((layer) => {
      if (layer.title !== 'Zonas de Rendimiento') {
        this.map.layers.remove(layer);
      }
    });

    const allFeatures = [...this.mapaReferencia.features, ...this.mapaActual.features];
    const rendimientos = [
      ...this.mapaReferencia.features.map((feature: any) => feature.properties.masa_rend_seco ?? feature.properties.rendimiento_normalizado),
      ...this.mapaActual.features.map((feature: any) => feature.properties.masa_rend_seco ?? 0)
    ];
    rendimientos.sort((a: number, b: number) => a - b);

    const getPercentileValue = (percentile: number) => {
      const index = Math.floor((percentile / 100) * rendimientos.length);
      return rendimientos[index] || rendimientos[rendimientos.length - 1];
    };

    const p19 = getPercentileValue(19);
    const p39 = getPercentileValue(39);
    const p59 = getPercentileValue(59);
    const p79 = getPercentileValue(79);
    const p100 = getPercentileValue(100);

    const mapas = [this.mapaReferencia, this.mapaActual];

    mapas.forEach((data, index) => {
      const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
      let field;

      if (index === 0 && data.features[0].properties.rendimiento_normalizado != 0) {
        field = 'rendimiento_normalizado';
      } else if (data.features[0].properties.hasOwnProperty('rendimiento_normalizado_calc')) {
        field = 'masa_rend_seco';
      } else {
        field = 'masa_rend_seco';
      }

      const renderer = new ClassBreaksRenderer({
        field: field,
        classBreakInfos: [
          {
            minValue: rendimientos[0],
            maxValue: p19,
            symbol: new SimpleMarkerSymbol({
              style: index === 0 ? 'circle' : 'diamond',
              color: 'red',
              size: '16px',
              outline: { color: index === 0 ? 'red' : 'black', width: 0.5 }
            }),
            label: 'Bajo rendimiento'
          },
          {
            minValue: p19,
            maxValue: p39,
            symbol: new SimpleMarkerSymbol({
              style: index === 0 ? 'circle' : 'diamond',
              color: 'orange',
              size: '16px',
              outline: { color: index === 0 ? 'orange' : 'black', width: 0.5 }
            }),
            label: '19% Percentil'
          },
          {
            minValue: p39,
            maxValue: p59,
            symbol: new SimpleMarkerSymbol({
              style: index === 0 ? 'circle' : 'diamond',
              color: 'yellow',
              size: '16px',
              outline: { color: index === 0 ? 'yellow' : 'black', width: 0.5 }
            }),
            label: '39% Percentil'
          },
          {
            minValue: p59,
            maxValue: p79,
            symbol: new SimpleMarkerSymbol({
              style: index === 0 ? 'circle' : 'diamond',
              color: 'lightgreen',
              size: '16px',
              outline: { color: index === 0 ? 'lightgreen' : 'black', width: 0.5 }
            }),
            label: '59% Percentil'
          },
          {
            minValue: p79,
            maxValue: p100,
            symbol: new SimpleMarkerSymbol({
              style: index === 0 ? 'circle' : 'diamond',
              color: 'green',
              size: '16px',
              outline: { color: index === 0 ? 'green' : 'black', width: 0.5 }
            }),
            label: 'Alto rendimiento'
          }
        ]
      });


      const geoJsonLayer = new GeoJSONLayer({
        url: geoJsonUrl,
        title: `Mapa ${index === 0 ? 'Referencia (Rendimiento Normalizado)' : 'Actual (Masa Rendimiento Seco)'}`,
        outFields: ['*'],
        renderer: renderer,
        popupTemplate: {
          title: `Mapa ${index === 0 ? 'Referencia' : 'Actual'}`,
          content: [
            {
              type: 'fields',
              fieldInfos: [
                { fieldName: 'anch_fja', label: 'Ancho de Faja' },
                { fieldName: 'humedad', label: 'Humedad (%)' },
                { fieldName: field, label: index === 0 ? 'Rendimiento Normalizado (ton/ha)' : 'Masa Rendimiento Seco (ton/ha)' },
                {
                  fieldName: field === 'masa_rend_seco' && 'masa_rend_seco_original' in data.features[0].properties ?
                    'masa_rend_seco_original' : field,
                  label: index === 0 ? 'Rendimiento Normalizado (ton/ha)' : 'Masa Rendimiento Seco Original (ton/ha)'
                },

                {
                  fieldName: 'masa_rend_seco',
                  label: 'Rendimiento Ajustado (ton/ha)',
                  visible: true
                },
                { fieldName: 'velocidad', label: 'Velocidad (km/h)' },
                { fieldName: 'fecha', label: 'Fecha' },
              ]
            }
          ],
          actions: [
            {
              id: index === 0 ? 'addToCalculation1' : 'addToCalculation2',
              title: index === 0 ? 'Agregar a calculo en posicion 1' : 'Agregar a calculo en posicion 2',
              image: "https://img.icons8.com/?size=100&id=1501&format=png&color=000000",
              type: 'button'
            }
          ]
        }
      });

      this.map.add(geoJsonLayer);
      this.isLoading = false;

      geoJsonLayer.when(() => {
        geoJsonLayer.queryExtent().then((response) => {
          if (response.extent) {
            this.view.goTo(response.extent.expand(1.2));
          } else { }
        }).catch((error) => {
          console.error('Error al calcular el extent del GeoJSONLayer:', error);
        });
      }).catch((error) => {
        console.error('Error al cargar la capa GeoJSON:', error);
      });
    });

    if (!this.isPopupEventListenerAdded) {
      reactiveUtils.on(
        () => this.view.popup,
        'trigger-action',
        (event: __esri.PopupTriggerActionEvent) => {
          if (event.action.id === 'addToCalculation1') {
            this.addToCalculation1(event);
          } else if (event.action.id === 'addToCalculation2') {
            this.addToCalculation2(event);
          }
        }
      );
      this.isPopupEventListenerAdded = true;
    }
    
  }           

  addToCalculation1(event: __esri.PopupTriggerActionEvent): void {
    const attributes = this.view.popup.selectedFeature.attributes;
    console.log(attributes);
    if (attributes.rendimiento_normalizado == 0) {
      this.posicion1Value = attributes.masa_rend_seco;
    } else {
      this.posicion1Value = attributes.rendimiento_normalizado;
    }
    this.cd.detectChanges();
    this.toastr.success(`Valor ${this.posicion1Value} agregado a posición 1`);
  }

  addToCalculation2(event: __esri.PopupTriggerActionEvent): void {
    const attributes = this.view.popup.selectedFeature.attributes;
    this.posicion2Value = attributes.masa_rend_seco_original ?? attributes.masa_rend_seco;
    this.cd.detectChanges();
    this.toastr.success(`Valor ${this.posicion2Value} agregado a posición 2`);
  }  

  calcularCoeficiente(): void {
    if (this.posicion2Value !== 0 && this.posicion2Value !== null && this.posicion1Value !== null) {
      this.coeficienteAjusteActual = parseFloat((this.posicion1Value / this.posicion2Value).toPrecision(3));
      this.cd.detectChanges();
      this.toastr.success(`Coeficiente calculado: ${this.coeficienteAjusteActual}`);
    } else {
      this.toastr.error('No se puede dividir por cero o valores nulos.');
    }
  }

  confirmarNormalizacion() {
    this.isLoading = true;
    this.reseteable = false;
    this.posicion1Value = null;
    this.posicion2Value = null;
    this.webSocketService.sendMessage({
      action: 'enviar_coeficientes',
      coeficientes: {
        coeficiente_mapa_referencia: this.coeficienteAjusteReferencia,
        coeficiente_mapa_actual: this.coeficienteAjusteActual
      }
    });
  }

  actualizarCoeficienteAjuste(coeficiente: number): void {
    this.coeficienteAjusteActual = coeficiente;
    this.webSocketService.sendMessage({
      action: 'actualizar_coeficiente_ajuste',
      coeficiente: coeficiente
    });
  }

  previsualizarMapa() {
    if (this.coeficienteAjusteActual !== null && this.coeficienteAjusteActual !== undefined) {
      if(Number(this.coeficienteAjusteActual) !== 1){
        this.reseteable = true;
      } else {
        this.reseteable = false;
      }

      this.isLoading = true;
      this.webSocketService.sendMessage({
        action: 'actualizar_coeficiente_ajuste',
        coeficiente: Number(this.coeficienteAjusteActual)
      });
    }

  }

  limitarDecimales() {
    this.coeficienteAjusteActual = parseFloat(this.coeficienteAjusteActual.toFixed(3));
  }

  formatearCoeficiente() {
    this.coeficienteAjusteActual = parseFloat(this.coeficienteAjusteActual.toPrecision(3));
  }

  ngOnDestroy(): void {
    this.webSocketService.disconnect();
  }
}
