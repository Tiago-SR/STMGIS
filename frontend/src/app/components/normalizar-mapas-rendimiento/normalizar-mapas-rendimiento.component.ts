import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CultivoService } from '../../services/cultivo.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import { WebSocketService } from '../../services/web-socket.service';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'; // Asegúrate de importar esta clase


@Component({
  selector: 'app-normalizar-mapas-rendimiento',
  templateUrl: './normalizar-mapas-rendimiento.component.html',
  styleUrls: ['./normalizar-mapas-rendimiento.component.scss']
})
export class NormalizarMapasRendimientoComponent implements OnInit {
  cultivo: any;
  mapaReferencia: any;
  mapaActual: any;
  nombreMapaReferencia: string = '';
  nombreMapaActual: string = '';
  coeficienteAjusteReferencia: number = 1;
  coeficienteAjusteActual: number = 1;
  coeficienteSugeridoReferencia: number = 1;
  coeficienteSugeridoActual: number = 1;
  cultivoId!: string; 
  map!: Map;
  view!: MapView;

  constructor(
    private cultivoService: CultivoService,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    
    this.cultivoId = this.route.snapshot.params['id']; 
    this.initMap();

    // Conectar al WebSocket
    this.webSocketService.connect(this.cultivoId);

    // Esperar a que el WebSocket esté abierto antes de enviar el mensaje
    this.webSocketService.onOpen().subscribe(() => {
      console.log('WebSocket está abierto, enviando mensaje iniciar_proceso');
      this.webSocketService.sendMessage({ action: 'iniciar_proceso' });
    });

    // Escuchar mensajes del WebSocket
    this.webSocketService.getMessages().subscribe((data) => {
      console.log('Mensaje del WebSocket:', data);

      if (data.action === 'nuevos_mapas') {
        this.mapaReferencia = data.mapa_referencia;
        this.mapaActual = data.mapa_actual;
        this.coeficienteSugeridoReferencia = data.coeficiente_sugerido_referencia;
        this.coeficienteSugeridoActual = data.coeficiente_sugerido_actual;
        this.coeficienteAjusteReferencia = this.coeficienteSugeridoReferencia;
        this.coeficienteAjusteActual = this.coeficienteSugeridoActual;
        this.nombreMapaReferencia = `Mapa Referencia (Acumulado)`;
        this.nombreMapaActual = `Mapa Actual ${data.current_pair_index + 2}`;

        this.addNormalizedMapLayer();
        this.cd.detectChanges();
      } else if (data.action === 'proceso_completado') {
        this.toastr.info('Se han procesado todos los mapas', 'Proceso completo');
        this.router.navigate(['/resultado-normalizacion']); // Redirigir a la vista de resultados
      } else if (data.action === 'proceso_cancelado') {
        this.toastr.info('El proceso ha sido cancelado', 'Proceso cancelado');
        this.router.navigate(['/ruta-inicial']); // Redirigir al usuario
      } else if (data.action === 'error') {
        this.toastr.error(data.message, 'Error');
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
  }
/*
  addNormalizedMapLayer(): void {
    if (!this.map) {
      console.error('El mapa no está inicializado.');
      return;
    }

    // Limpiar todas las capas previas del mapa
    this.map.layers.removeAll();

    const mapas = [this.mapaReferencia, this.mapaActual];

    mapas.forEach((data, index) => {
      const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
      console.log('GeoJSON URL:', geoJsonUrl);
      const geoJsonLayer = new GeoJSONLayer({
        url: geoJsonUrl,
        title: `Mapa ${index === 0 ? 'Referencia' : 'Actual'}`,
        outFields: ['*'],
        renderer: new SimpleRenderer({
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: index === 0 ? 'blue' : 'red', // Diferenciar el color para cada mapa
            size: '8px',
            outline: {
              color: 'black',
              width: 0.5
            }
          })
        }),
        popupTemplate: {
          title: `Mapa ${index === 0 ? 'Referencia' : 'Actual'}`,
          content: [
            {
              type: 'fields',
              fieldInfos: [
                { fieldName: 'anch_fja', label: 'Ancho de Faja' },
                { fieldName: 'humedad', label: 'Humedad (%)' },
                { fieldName: 'masa_rend_seco', label: 'Masa de Rendimiento Seco (ton/ha)' },
                { fieldName: 'velocidad', label: 'Velocidad (km/h)' },
                { fieldName: 'fecha', label: 'Fecha' },
                { fieldName: 'rendimiento_real', label: 'Rendimiento Real' },
                { fieldName: 'rendimiento_relativo', label: 'Rendimiento Relativo' }
              ]
            }
          ]
        }
      });

      this.map.add(geoJsonLayer);

      geoJsonLayer.when(() => {
        geoJsonLayer.queryExtent().then((response) => {
          if (response.extent) {
            this.view.goTo(response.extent.expand(1.2));
          } else {
            console.log(`No se encontraron entidades o las geometrías son nulas para el mapa ${index + 1}.`);
          }
        }).catch((error) => {
          console.error('Error al calcular el extent del GeoJSONLayer:', error);
        });
      }).catch((error) => {
        console.error('Error al cargar la capa GeoJSON:', error);
      });
    });
  }
*/

addNormalizedMapLayer(): void {
  if (!this.map) {
    console.error('El mapa no está inicializado.');
    return;
  }

  // Limpiar todas las capas previas del mapa
  this.map.layers.removeAll();

  const mapas = [this.mapaReferencia, this.mapaActual];

  mapas.forEach((data, index) => {
    const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
    console.log('GeoJSON URL:', geoJsonUrl);

    // Obtener los valores de 'masa_rend_seco' de los datos
    const rendimientos = data.features.map((feature: any) => feature.properties.masa_rend_seco);

    // Ordenar los valores de 'masa_rend_seco' para calcular percentiles
    rendimientos.sort((a: number, b: number) => a - b);

    const getPercentileValue = (percentile: number) => {
      const index = Math.floor((percentile / 100) * rendimientos.length);
      return rendimientos[index] || rendimientos[rendimientos.length - 1]; // Ajuste para el 100%
    };

    // Calcular percentiles
    const p19 = getPercentileValue(19);
    const p39 = getPercentileValue(39);
    const p59 = getPercentileValue(59);
    const p79 = getPercentileValue(79);
    const p100 = getPercentileValue(100);

    // Definir el ClassBreaksRenderer
    const renderer = new ClassBreaksRenderer({
      field: 'masa_rend_seco',
      classBreakInfos: [
        {
          minValue: rendimientos[0],  // Valor mínimo
          maxValue: p19,
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: 'red',
            size: '8px',
            outline: { color: 'red', width: 0.5 }
          }),
          label: 'Bajo rendimiento'
        },
        {
          minValue: p19,
          maxValue: p39,
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: 'orange',
            size: '8px',
            outline: { color: 'orange', width: 0.5 }
          }),
          label: '19% Percentil'
        },
        {
          minValue: p39,
          maxValue: p59,
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: 'yellow',
            size: '8px',
            outline: { color: 'yellow', width: 0.5 }
          }),
          label: '39% Percentil'
        },
        {
          minValue: p59,
          maxValue: p79,
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: 'lightgreen',
            size: '8px',
            outline: { color: 'lightgreen', width: 0.5 }
          }),
          label: '59% Percentil'
        },
        {
          minValue: p79,
          maxValue: p100,
          symbol: new SimpleMarkerSymbol({
            style: 'circle',
            color: 'green',
            size: '8px',
            outline: { color: 'green', width: 0.5 }
          }),
          label: 'Alto rendimiento'
        }
      ]
    });

    const geoJsonLayer = new GeoJSONLayer({
      url: geoJsonUrl,
      title: `Mapa ${index === 0 ? 'Referencia' : 'Actual'}`,
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
              { fieldName: 'masa_rend_seco', label: 'Masa de Rendimiento Seco (ton/ha)' },
              { fieldName: 'velocidad', label: 'Velocidad (km/h)' },
              { fieldName: 'fecha', label: 'Fecha' },
              { fieldName: 'rendimiento_real', label: 'Rendimiento Real' },
              { fieldName: 'rendimiento_relativo', label: 'Rendimiento Relativo' }
            ]
          }
        ]
      }
    });

    this.map.add(geoJsonLayer);

    geoJsonLayer.when(() => {
      geoJsonLayer.queryExtent().then((response) => {
        if (response.extent) {
          this.view.goTo(response.extent.expand(1.2));
        } else {
          console.log(`No se encontraron entidades o las geometrías son nulas para el mapa ${index + 1}.`);
        }
      }).catch((error) => {
        console.error('Error al calcular el extent del GeoJSONLayer:', error);
      });
    }).catch((error) => {
      console.error('Error al cargar la capa GeoJSON:', error);
    });
  });
}


  confirmarNormalizacion() {
    // Enviar los coeficientes al backend a través del WebSocket
    this.webSocketService.sendMessage({
      action: 'enviar_coeficientes',
      coeficientes: {
        coeficiente_mapa_referencia: this.coeficienteAjusteReferencia,
        coeficiente_mapa_actual: this.coeficienteAjusteActual
      }
    });
  }

  // Al destruir el componente, desconectar el WebSocket
  ngOnDestroy(): void {
    this.webSocketService.disconnect();
  }
}
