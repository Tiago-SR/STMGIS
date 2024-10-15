
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CultivoService } from '../../services/cultivo.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';


@Component({
  selector: 'app-normalizar-mapas-rendimiento',
  templateUrl: './normalizar-mapas-rendimiento.component.html',
  styleUrl: './normalizar-mapas-rendimiento.component.scss'
})
export class NormalizarMapasRendimientoComponent implements OnInit {
  cultivo: any;
  mapas: any[] = [];
  coeficientes: number[] = [];
  currentPairIndex: number = 0;
  ajusteForm: FormGroup;
  cultivoId!: string; 
  map!: Map;
  view!: MapView;
  mapInitialized: boolean = false;
  isLoading = false; // Variable que controla la visibilidad del spinner
  percentil_80_df1!: number;
  percentil_80_df2!: number;
  selectedVisualizationType: string = 'default'; // Por defecto
  selectedField: string = 'masa_rend_seco'; // Campo por defecto

  constructor(
    private fb: FormBuilder,
    private cultivoService: CultivoService,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.ajusteForm = this.fb.group({
      coeficienteAjuste: [1, Validators.required]
    });
  }

  ngOnInit(): void {
    this.isLoading = true; // Mostrar el spinner desde que inicia la carga

    this.initMap();
    this.cultivoId = this.route.snapshot.params['id']; // Obtener el cultivoId de la URL
    this.cargarDatosNormalizacion(); 
    
     
  }  
 
  initMap(): void {
    const viewDiv = document.getElementById('viewDiv');
    if (!viewDiv) {
      console.error('viewDiv no encontrado');
      return;
    }

    this.map = new Map({
      basemap: 'hybrid'
    });

    this.view = new MapView({
      container: 'viewDiv',
      map: this.map,
      center: [-56.0698, -32.4122],
      zoom: 8
    });

    this.view.when(() => {
      console.log('Mapa inicializado correctamente');
      this.isLoading = false; // Ocultar el spinner después de que el mapa se inicialice

    }).catch((error) => {
      console.error('Error al inicializar el mapa: ', error);
      this.isLoading = false; // Ocultar el spinner en caso de error

    });
  }



  cargarDatosNormalizacion() {
    this.isLoading = true; 

    // Llamar al backend para obtener los mapas de rendimiento y los coeficientes iniciales
    this.cultivoService.obtenerDatosNormalizacion(this.cultivoId).subscribe(
      response => {
        console.log('Respuesta recibida:', response); 

        this.cultivo = response.cultivo;
        this.mapas = [response.mapa1, response.mapa2];
        console.log('Mapas asignados:', this.mapas);

        this.percentil_80_df1 = response.percentil_80_df1;
        this.percentil_80_df2 = response.percentil_80_df2;     


        this.coeficientes = [response.mapa1.coeficiente_aplicado, response.mapa2.coeficiente_aplicado];

        console.log('GeoJSON Data:', this.mapas[0]);
        this.addNormalizedMapLayer(this.mapas);        
        this.cd.detectChanges();

      },
      error => {
        this.toastr.error('Error al cargar los datos para la normalización', 'Error');
        console.error('Error al cargar los datos para la normalización:', error);
        this.isLoading = false; // Ocultar el spinner en caso de error

      }
    );
  }
 /* esta funciona
  addNormalizedMapLayer(geojsonData: any[]): void {
    if (!this.map) {
      console.error('El mapa no está inicializado.');
      return;
    }
  
    this.isLoading = true; // Mostrar el spinner al iniciar la carga

    // Limpiar todas las capas previas del mapa
    this.map.layers.removeAll();
  
    // Encontrar los valores máximos de masa_rend_seco en ambos mapas
    const allFeatures = geojsonData.flatMap(data => data.features);
    const maxMasaRendSeco = Math.max(...allFeatures.map(f => f.properties.masa_rend_seco));

    let layersLoaded = 0;
  
    geojsonData.forEach((data, index) => {
      const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
      console.log('GeoJSON URL:', geoJsonUrl);
  
      const renderer = new ClassBreaksRenderer({
        field: 'masa_rend_seco', // Campo a usar para la clasificación
        classBreakInfos: [
          {
            minValue: 0,
            maxValue: maxMasaRendSeco / 4,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)', // Blanco
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)', // Mismo color que el punto
                width: 0.5
              }
            }),
            label: 'Bajo'
          },
          {
            minValue: maxMasaRendSeco / 4,
            maxValue: maxMasaRendSeco / 2,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 128, 128, 0.8)' : 'rgba(128, 128, 255, 0.8)', // Intermedio claro
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 128, 128, 0.8)' : 'rgba(128, 128, 255, 0.8)', // Intermedio claro
                width: 0.5
              }
            }),
            label: 'Medio bajo'
          },
          {
            minValue: maxMasaRendSeco / 2,
            maxValue: (3 * maxMasaRendSeco) / 4,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)', // Intermedio fuerte
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)', // Mismo color que el punto
                width: 0.5
              }
            }),
            label: 'Medio alto'
          },
          {
            minValue: (3 * maxMasaRendSeco) / 4,
            maxValue: maxMasaRendSeco,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(128, 0, 0, 0.8)' : 'rgba(0, 0, 128, 0.8)', // Rojo o azul oscuro
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(128, 0, 0, 0.8)' : 'rgba(0, 0, 128, 0.8)', // Mismo color que el punto
                width: 0.5
              }
            }),
            label: 'Alto'
          }
        ]
      });
  
      const geoJsonLayer = new GeoJSONLayer({
        url: geoJsonUrl,
        title: `Mapa Normalizado ${index + 1}`,
        outFields: ['*'],
        renderer: renderer, // Usar el renderizador con las escalas de color
        popupTemplate: {
          title: `Mapa Normalizado ${index + 1}`,
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
        }).finally(() => {
          layersLoaded++;
          if (layersLoaded === geojsonData.length) {
            this.isLoading = false; // Ocultar el spinner una vez que todas las capas se hayan cargado
          }
        });
      }).catch((error) => {
        console.error('Error al cargar la capa GeoJSON:', error);
        this.isLoading = false; // Ocultar el spinner en caso de error
      });
    });
  } 
*/

  onVisualizationTypeChange(): void {
    if (this.selectedVisualizationType === 'custom') {
      this.addNormalizedMapLayer(this.mapas, this.selectedField); // Actualiza el mapa según el campo seleccionado
    } else {
      this.addNormalizedMapLayer(this.mapas); // Visualización por defecto
    }
  }

  addNormalizedMapLayer(geojsonData: any[], field: string = 'masa_rend_seco'): void {
    if (!this.map) {
      console.error('El mapa no está inicializado.');
      return;
    }
  
    this.isLoading = true; // Mostrar el spinner al iniciar la carga
  
    // Limpiar todas las capas previas del mapa
    this.map.layers.removeAll();
  
    // Encontrar los valores máximos del campo seleccionado en ambos mapas
    const allFeatures = geojsonData.flatMap(data => data.features);
    const maxFieldValue = Math.max(...allFeatures.map(f => f.properties[field]));
  
    let layersLoaded = 0;
  
    geojsonData.forEach((data, index) => {
      const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
      console.log('GeoJSON URL:', geoJsonUrl);
  
      const renderer = new ClassBreaksRenderer({
        field, // Usar el campo seleccionado para la clasificación
        classBreakInfos: [
          {
            minValue: 0,
            maxValue: maxFieldValue / 4,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                width: 0.5
              }
            }),
            label: 'Bajo'
          },
          {
            minValue: maxFieldValue / 4,
            maxValue: maxFieldValue / 2,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 128, 128, 0.8)' : 'rgba(128, 128, 255, 0.8)',
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 128, 128, 0.8)' : 'rgba(128, 128, 255, 0.8)',
                width: 0.5
              }
            }),
            label: 'Medio bajo'
          },
          {
            minValue: maxFieldValue / 2,
            maxValue: (3 * maxFieldValue) / 4,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)',
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)',
                width: 0.5
              }
            }),
            label: 'Medio alto'
          },
          {
            minValue: (3 * maxFieldValue) / 4,
            maxValue: maxFieldValue,
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: index === 0 ? 'rgba(128, 0, 0, 0.8)' : 'rgba(0, 0, 128, 0.8)',
              size: '8px',
              outline: {
                color: index === 0 ? 'rgba(128, 0, 0, 0.8)' : 'rgba(0, 0, 128, 0.8)',
                width: 0.5
              }
            }),
            label: 'Alto'
          }
        ]
      });
  
      const geoJsonLayer = new GeoJSONLayer({
        url: geoJsonUrl,
        title: `Mapa Normalizado ${index + 1}`,
        outFields: ['*'],
        renderer: renderer, // Usar el renderizador con las escalas de color
        popupTemplate: {
          title: `Mapa Normalizado ${index + 1}`,
          content: [
            {
              type: 'fields',
              fieldInfos: [
                { fieldName: 'anch_fja', label: 'Ancho de Faja' },
                { fieldName: 'humedad', label: 'Humedad (%)' },
                { fieldName: field, label: `Rendimiento (${field})` },
                { fieldName: 'velocidad', label: 'Velocidad (km/h)' },
                { fieldName: 'fecha', label: 'Fecha' }
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
        }).finally(() => {
          layersLoaded++;
          if (layersLoaded === geojsonData.length) {
            this.isLoading = false; // Ocultar el spinner una vez que todas las capas se hayan cargado
          }
        });
      }).catch((error) => {
        console.error('Error al cargar la capa GeoJSON:', error);
        this.isLoading = false; // Ocultar el spinner en caso de error
      });
    });
  }
  

  // ajustarCoeficiente(value: number) {
  //   let nuevoValor = this.ajusteForm.get('coeficienteAjuste')?.value + value;
  //   if (nuevoValor < 0) {
  //     nuevoValor = 0; // Evitar coeficiente negativo
  //   }
  //   this.ajusteForm.patchValue({ coeficienteAjuste: nuevoValor });
  // }

  // confirmarNormalizacion() {
  //   if (this.currentPairIndex >= this.mapas.length - 1) {
  //     this.toastr.warning('No hay más mapas para normalizar', 'Proceso finalizado');
  //     return;
  //   }
  
  //   const coeficienteAjuste = this.ajusteForm.get('coeficienteAjuste')?.value;
  //   this.coeficientes[this.currentPairIndex + 1] *= coeficienteAjuste;
  
  //   // Corregir: agregar el coeficienteAjuste como argumento
  //   this.cultivoService.confirmarNormalizacion(this.cultivo.id, coeficienteAjuste).subscribe(
  //     response => {
  //       this.toastr.success('Normalización confirmada para el par de mapas', 'Éxito');
  //       this.currentPairIndex++;
  //       this.actualizarFormulario();
  //     },
  //     error => {
  //       this.toastr.error('Error al confirmar la normalización', 'Error');
  //       console.error('Error al confirmar la normalización:', error);
  //     }
  //   );
  // }
  // actualizarFormulario() {
  //   if (this.currentPairIndex < this.mapas.length - 1) {
  //     this.ajusteForm.patchValue({ coeficienteAjuste: 1 }); // Reiniciar el coeficiente para el siguiente par
  //     this.cargarDatosNormalizacion(); // Cargar el siguiente par de mapas

  //   } else {
  //     this.toastr.info('Se han procesado todos los pares de mapas', 'Proceso completo');
  //     this.router.navigate(['/resultado-normalizacion']); // Redirigir a la vista de resultados
  //   }
  // }

}