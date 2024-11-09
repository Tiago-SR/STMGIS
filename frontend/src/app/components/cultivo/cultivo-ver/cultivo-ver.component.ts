import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CultivoService } from '../../../services/cultivo.service';
import Cultivo from '../../../models/cultivo.model';
import { CampoService } from '../../../services/campo.service';
import { EmpresaService } from '../../../services/empresa.service';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import esri = __esri;
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import { FormControl } from '@angular/forms';
import { Especie } from '../../../models/especie.model';
import { EspecieService } from '../../../services/especie.service';
import { HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-cultivo-ver',
  templateUrl: './cultivo-ver.component.html',
  styleUrl: './cultivo-ver.component.scss'
})
export class CultivoVerComponent implements OnInit {
  idCultivo: string = '';
  nombreEmpresa = '';
  cultivo: Cultivo | undefined = undefined;
  idCampo: string | undefined = '';

  // Cosas para el mapa
  map!: Map;
  view!: MapView;
  geojsonLayer!: GeoJSONLayer;
  geojsonLayerMBA!: GeoJSONLayer;
  geojsonLayerRendimientoAmbiente!: GeoJSONLayer;
  cultivoDataLayerMapaRendimiento!: GeoJSONLayer;
  highlightedGraphic: esri.Graphic | null = null;
  originalSymbol: esri.Symbol | null = null;

  // Checkbox's controls
  mapaRendimientoChecked = new FormControl(false);
  mbaChecked = new FormControl(false);
  rendimientoAmbienteChecked = new FormControl(false);
  ajusteMBAChecked = new FormControl(false);
  showPercentileTable = false;
  extraccionPChecked = new FormControl(false);
  extraccionKChecked = new FormControl(false);
  extraccionNChecked = new FormControl(false);

  extraccionP: number = 0;
  extraccionK: number = 0;
  geojsonLayerExtraccionP: GeoJSONLayer | undefined;
  geojsonLayerExtraccionK: GeoJSONLayer | undefined;
  geojsonLayerCoeficienteVariacion: GeoJSONLayer | undefined;
  geojsonLayerExtraccionN: GeoJSONLayer | undefined;


  // Percentiles
  p19: number = 0;
  p39: number = 0;
  p59: number = 0;
  p79: number = 0;
  p100: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private campoService: CampoService,
    private empresaService: EmpresaService,
    private toast: ToastrService,
    private cultivoService: CultivoService,
    private especieService: EspecieService
  ) { }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.idCultivo = params.get('id') ?? '';
      if (!this.idCultivo) {
        this.toast.warning('Cultivo no encontrado', 'Alerta');
        this.router.navigate(['/']);
      }
      
      this.cultivoService.obtenerCultivo(this.idCultivo).subscribe({
        next: data => {
          this.cultivo = data;
          this.campoService.getCampoById(this.cultivo?.campo).subscribe({
            next: data => {
              this.idCampo = data.id;
              this.empresaService.getEmpresaById(data.empresa).subscribe({
                next: data => {
                  this.nombreEmpresa = data.nombre;
                  this.initMap()
                  this.view.when(() => {
                    console.log('Mapa inicializado');
                    this.cargarCampo();
                    this.cargarMapaRendimiento();
                    this.cargarRendimientoAmbiente();
                });

                },
                error: error => {
                  this.toast.warning('Error al obtener la empresa', 'Alerta');
                  this.router.navigate(['/']);
                }
              });
            },
            error: error => {
              this.toast.warning('Error al obtener el campo', 'Alerta');
              this.router.navigate(['/']);
            }
          });
        },
        error: error => {
          this.toast.warning('Cultivo no encontrado', 'Alerta');
          this.router.navigate(['/']);
        }
      })
      
    });
  }

  initMap() {
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

  highlightFeature(graphic: esri.Graphic) {
    if (this.highlightedGraphic && this.originalSymbol) {
      this.highlightedGraphic.symbol = this.originalSymbol;
    }
    this.originalSymbol = graphic.symbol;
    this.highlightedGraphic = graphic;

    const highlightSymbol = new SimpleFillSymbol({
      color: [255, 255, 0, 0.5],
      style: 'solid',
      outline: {
        color: [255, 0, 0],
        width: 2
      }
    });
    graphic.symbol = highlightSymbol;
  }
  removeHighlight() {
    if (this.highlightedGraphic && this.originalSymbol) {
      this.highlightedGraphic.symbol = this.originalSymbol;
      this.highlightedGraphic = null;
      this.originalSymbol = null;
    }
  }
  cargarCampo(): void {
    const uuid = this.idCampo
    if (!uuid) {
      this.p19 = 0;
      this.p39 = 0;
      this.p59 = 0;
      this.p79 = 0;
      this.p100 = 0;
  
      if (this.geojsonLayerMBA) {
        this.map.remove(this.geojsonLayerMBA);
      }
  
      if (this.cultivoDataLayerMapaRendimiento) {
        this.map.remove(this.cultivoDataLayerMapaRendimiento);
      }
  
      this.view.goTo({
        center: [-56.0698, -32.4122],
        zoom: 8
      });
  
      this.removeHighlight();
      return;
    }
  
    const geojsonUrl = `http://api.proyecto.local/geojson/?campo_id=${uuid}`;
  
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
  
    this.geojsonLayerMBA = new GeoJSONLayer({
      url: geojsonUrl,
      title: 'Ambientes',
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
  
    this.map.add(this.geojsonLayerMBA);
    this.geojsonLayerMBA.visible = false;
    this.geojsonLayerMBA.when(() => {
      this.geojsonLayerMBA.queryFeatures().then((featureSet) => {
        if (featureSet.features.length > 0 && featureSet.features[0].geometry) {
          let extent = featureSet.features[0].geometry.extent.clone();
          featureSet.features.forEach((feature: esri.Graphic, index: number) => {
            if (index > 0 && feature.geometry) {
              extent = extent.union(feature.geometry.extent);
            }
          });
          this.view.goTo(extent.expand(1.2));
        } else {
          console.log('No se encontraron entidades para el campo seleccionado o las geometrías son nulas.');
        }
      });
    });
  }
  changeLayer(layer: string): void {
    if (layer === 'ambientes') {
      this.map.remove(this.cultivoDataLayerMapaRendimiento);
      this.map.add(this.geojsonLayer);
    } else {
      this.map.remove(this.geojsonLayer);
      this.map.add(this.cultivoDataLayerMapaRendimiento);
    }

  } 

//cargar mapas a vista
  cargarMapaRendimiento(): void {
    if (!this.idCampo) {
      return;
    }
  
    //const cultivoDataUrl = `http://api.proyecto.local/cultivodata-geojson/?campo_id=${this.idCampo}`;
    const cultivoDataUrl = `http://api.proyecto.local/cultivodata-geojson-por-cultivo/?cultivo_id=${this.idCultivo}`;

    if (this.cultivoDataLayerMapaRendimiento) {
      this.map.remove(this.cultivoDataLayerMapaRendimiento);
    }
  
    // Obtener los datos del GeoJSON desde el endpoint
    fetch(cultivoDataUrl)
      .then(response => response.json())
      .then(data => {
        const rendimientos = data.features.map((feature: any) => feature.properties.rendimiento_real);
  
        rendimientos.sort((a: number, b: number) => a - b);
  
        const getPercentileValue = (percentile: number) => {
          const index = Math.floor((percentile / 100) * rendimientos.length);
          return rendimientos[index] || rendimientos[rendimientos.length - 1]; // Ajuste para el 100%
        };
  
        this.p19 = getPercentileValue(19);
        this.p39 = getPercentileValue(39);
        this.p59 = getPercentileValue(59);
        this.p79 = getPercentileValue(79);
        this.p100 = getPercentileValue(100);
  
        this.cultivoDataLayerMapaRendimiento = new GeoJSONLayer({
          url: cultivoDataUrl,
          title: 'Cultivo Data',
          outFields: ['masa_rend_seco', 'rendimiento_relativo', 'rendimiento_real'],
          renderer: new SimpleRenderer({
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: 'blue', // Cambia esto al color que desees
              size: '8px', // Tamaño del punto
              outline: {
                color: 'black', // Color de borde
                width: 0.001 // Ancho del borde
              }
            }),
            visualVariables: [
              {
                type: 'color',
                field: 'rendimiento_real',
                stops: [
                  { value: rendimientos[0], color: 'red' },
                  { value: this.p19, color: 'red' },
                  { value: this.p19 + 0.001, color: 'orange' },
                  { value: this.p39, color: 'orange' },
                  { value: this.p39 + 0.001, color: 'yellow' },
                  { value: this.p59, color: 'yellow' },
                  { value: this.p59 + 0.001, color: 'lightgreen' },
                  { value: this.p79, color: 'lightgreen' },
                  { value: this.p79 + 0.001, color: 'green' },
                  { value: this.p100, color: 'green' }
                ]
              } as esri.ColorVariableProperties,
              {
                type: 'color',
                field: 'rendimiento_real',
                target: 'outline',
                stops: [
                  { value: rendimientos[0], color: 'red' },
                  { value: this.p19, color: 'red' },
                  { value: this.p19 + 0.001, color: 'orange' },
                  { value: this.p39, color: 'orange' },
                  { value: this.p39 + 0.001, color: 'yellow' },
                  { value: this.p59, color: 'yellow' },
                  { value: this.p59 + 0.001, color: 'lightgreen' },
                  { value: this.p79, color: 'lightgreen' },
                  { value: this.p79 + 0.001, color: 'green' },
                  { value: this.p100, color: 'green' }
                ]
              } as esri.ColorVariableProperties
            ]
          }),
          popupTemplate: {
            title: 'Cultivo Data',
            content: [
              {
                type: 'fields',
                fieldInfos: [
                  { fieldName: 'masa_rend_seco', label: 'Rend Seco' },
                  { fieldName: 'rendimiento_relativo', label: 'Rend Relativo' },
                  { fieldName: 'rendimiento_real', label: 'Rend Real' }
                ]
              }
            ]
          }
        });
      // Después de crear la capa, la agregamos al mapa y configuramos su visibilidad inicial
      this.cultivoDataLayerMapaRendimiento.visible = this.mapaRendimientoChecked.value ?? false;
      this.map.add(this.cultivoDataLayerMapaRendimiento);
    
      })
      .catch(error => {
        console.error('Error al cargar los datos del GeoJSON:', error);
      });
  }
  cargarRendimientoAmbiente(): void {
    if (!this.idCultivo) {
        console.log('No hay ID de cultivo');
        return;
    }
    
    console.log('Cargando rendimiento ambiente para cultivo:', this.idCultivo);
    const url = `http://api.proyecto.local/rendimiento-ambiente-geojson/${this.idCultivo}`;

    // Si ya existe una capa, la removemos
    if (this.geojsonLayerRendimientoAmbiente) {
        console.log('Removiendo capa existente');
        this.map.remove(this.geojsonLayerRendimientoAmbiente);
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data);
            
            if (!data.features || data.features.length === 0) {
                console.warn('No hay features en los datos');
                this.toast.warning('No hay datos de rendimiento por ambiente disponibles');
                return;
            }

            // Crear un Blob con los datos
            const blob = new Blob([JSON.stringify(data)], {
                type: 'application/json'
            });

            // Crear URL para el Blob
            const blobUrl = URL.createObjectURL(blob);

            // Crear la capa
            this.geojsonLayerRendimientoAmbiente = new GeoJSONLayer({
                url: blobUrl,
                title: 'Rendimiento por Ambiente',
                outFields: ['*'],
                geometryType: "polygon",
                spatialReference: { wkid: 4326 },
                renderer: new SimpleRenderer({
                    symbol: new SimpleFillSymbol({
                        style: 'solid',
                        color: [255, 255, 255, 0.4],
                        outline: {
                            color: [0, 0, 0, 1],
                            width: 1
                        }
                    }),
                    visualVariables: [{
                        type: 'color',
                        field: 'rendimiento_real',
                        stops: [
                          { value: 0, color: [255, 0, 0, 0.7] },               // Rojo para valores bajos
                          { value: data.percentiles.p20, color: [255, 128, 0, 0.7] },  // Naranja para el percentil 20
                          { value: data.percentiles.p40, color: [255, 255, 0, 0.7] },  // Amarillo para el percentil 40
                          { value: data.percentiles.p60, color: [128, 255, 0, 0.7] },  // Verde claro para el percentil 60
                          { value: data.percentiles.p80, color: [0, 128, 0, 0.7] }     // Verde oscuro para el percentil 80
                      ]
                    } as esri.ColorVariableProperties]
                }),
                labelingInfo: [{
                  symbol: {
                      type: "text",
                      color: "black",
                      haloColor: "white",
                      haloSize: "2px",
                      font: {
                          size: 12,
                          family: "Arial",
                          weight: "bold"
                      }
                  },
                  labelPlacement: "center-center",
                  labelExpressionInfo: {
                      expression: "Round($feature.rendimiento_real, 2) + ' ton/ha'"
                  }
              }],
            });

            console.log('Capa creada, agregando al mapa...');
            this.map.add(this.geojsonLayerRendimientoAmbiente);
            
            // Establecer la visibilidad según el estado del checkbox
            this.geojsonLayerRendimientoAmbiente.visible = this.rendimientoAmbienteChecked.value ?? false;
            console.log('Visibilidad de la capa:', this.geojsonLayerRendimientoAmbiente.visible);

            // Zoom a la capa cuando esté lista
            this.geojsonLayerRendimientoAmbiente.when(() => {
                console.log('Capa cargada completamente');
                if (this.geojsonLayerRendimientoAmbiente.fullExtent) {
                    this.view.goTo(this.geojsonLayerRendimientoAmbiente.fullExtent);
                }
            });

            // Limpiar el URL del Blob después de un tiempo
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                console.log('Blob URL liberada');
            }, 5000);
        })
        .catch(error => {
            console.error('Error al cargar la capa de rendimiento:', error);
            this.toast.error('Error al cargar el rendimiento por ambiente');
        });
  }
  cargarExtraccionAmbienteP(): void {
    if (!this.idCultivo) {
      console.log('No hay ID de cultivo');
      return;
    }
    
    console.log('Cargando extracción de P por ambiente para cultivo:', this.idCultivo);
    const url = `http://api.proyecto.local/extraccion-p-ambiente-geojson/${this.idCultivo}`;

    // Si ya existe una capa, la removemos
    if (this.geojsonLayerExtraccionP) {
      console.log('Removiendo capa existente de extracción de P');
      this.map.remove(this.geojsonLayerExtraccionP);
    }

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Datos recibidos de extracción de P:', data);
        
        if (!data.features || data.features.length === 0) {
          console.warn('No hay features en los datos de extracción de P');
          this.toast.warning('No hay datos de extracción de P por ambiente disponibles');
          return;
        }

        // Crear el GeoJSON
        const blob = new Blob([JSON.stringify(data)], {
          type: 'application/json'
        });
        const blobUrl = URL.createObjectURL(blob);

        this.geojsonLayerExtraccionP = new GeoJSONLayer({
          url: blobUrl,
          title: 'Extracción de P por Ambiente',
          outFields: ['*'],
          geometryType: "polygon",
          spatialReference: { wkid: 4326 },
          renderer: new SimpleRenderer({
            symbol: new SimpleFillSymbol({
              style: 'solid',
              color: [255, 255, 255, 0.4],
              outline: {
                color: [0, 0, 0, 1],
                width: 1
              }
            }),
            visualVariables: [{
              type: 'color',
              field: 'extraccion_p',
              stops: [
                { value: 0, color: [255, 255, 255, 0.7] },       // Blanco para valores bajos
                { value: data.percentiles.p40, color: [200, 200, 255, 0.7] },  // Azul muy claro
                { value: data.percentiles.p60, color: [100, 100, 255, 0.7] },  // Azul claro
                { value: data.percentiles.p80, color: [0, 0, 255, 0.7] }       // Azul intenso para valores altos
              ]
            } as esri.ColorVariableProperties]
          }),
          labelingInfo: [{
            symbol: {
              type: "text",
              color: "black",
              haloColor: "white",
              haloSize: "2px",
              font: {
                size: 12,
                family: "Arial",
                weight: "bold"
              }
            },
            labelPlacement: "center-center",
            labelExpressionInfo: {
              expression: "Round($feature.extraccion_p, 2) + ' kg de P/ha'"
            }
          }]
        });

        console.log('Capa de extracción de P creada, agregando al mapa...');
        this.map.add(this.geojsonLayerExtraccionP);
        
        // Establecer la visibilidad según el estado del checkbox
        this.geojsonLayerExtraccionP.visible = this.extraccionPChecked.value ?? false;
        console.log('Visibilidad de la capa de extracción de P:', this.geojsonLayerExtraccionP.visible);

        // Zoom a la capa cuando esté lista
        this.geojsonLayerExtraccionP.when(() => {
          console.log('Capa de extracción de P cargada completamente');
        
        });

        // Limpiar el URL del Blob después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          console.log('Blob URL de extracción de P liberada');
        }, 5000);
      })
      .catch(error => {
        console.error('Error al cargar la capa de extracción de P:', error);
        this.toast.error('Error al cargar la extracción de P por ambiente');
      });
  }
  cargarExtraccionAmbienteK(): void {
    if (!this.idCultivo) {
      console.log('No hay ID de cultivo');
      return;
    }
    
    console.log('Cargando extracción de K por ambiente para cultivo:', this.idCultivo);
    const url = `http://api.proyecto.local/extraccion-k-ambiente-geojson/${this.idCultivo}`;
  
    // Si ya existe una capa, la removemos
    if (this.geojsonLayerExtraccionK) {
      console.log('Removiendo capa existente de extracción de K');
      this.map.remove(this.geojsonLayerExtraccionK);
    }
  
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Datos recibidos de extracción de K:', data);
        
        if (!data.features || data.features.length === 0) {
          console.warn('No hay features en los datos de extracción de K');
          this.toast.warning('No hay datos de extracción de K por ambiente disponibles');
          return;
        }
  
        // Crear el GeoJSON
        const blob = new Blob([JSON.stringify(data)], {
          type: 'application/json'
        });
        const blobUrl = URL.createObjectURL(blob);
  
        this.geojsonLayerExtraccionK = new GeoJSONLayer({
          url: blobUrl,
          title: 'Extracción de K por Ambiente',
          outFields: ['*'],
          geometryType: "polygon",
          spatialReference: { wkid: 4326 },
          renderer: new SimpleRenderer({
            symbol: new SimpleFillSymbol({
              style: 'solid',
              color: [255, 255, 255, 0.4],
              outline: {
                color: [0, 0, 0, 1],
                width: 1
              }
            }),
            visualVariables: [{
              type: 'color',
              field: 'extraccion_k',  // Usar extraccion_k aquí
              stops: [
                { value: 0, color: [255, 255, 255, 0.7] },     // Blanco para valores bajos
                { value: data.percentiles.p40, color: [255, 200, 200, 0.7] },  // Rosa claro
                { value: data.percentiles.p60, color: [255, 100, 100, 0.7] },  // Rojo claro
                { value: data.percentiles.p80, color: [255, 0, 0, 0.7] }       // Rojo intenso para valores altos
            ]
            } as esri.ColorVariableProperties]
          }),
          labelingInfo: [{
            symbol: {
              type: "text",
              color: "black",
              haloColor: "white",
              haloSize: "2px",
              font: {
                size: 12,
                family: "Arial",
                weight: "bold"
              }
            },
            labelPlacement: "center-center",
            labelExpressionInfo: {
              expression: "Round($feature.extraccion_k, 2) + ' kg de K/ha'"  // Usar extraccion_k aquí
            }
          }]
        });
  
        console.log('Capa de extracción de K creada, agregando al mapa...');
        this.map.add(this.geojsonLayerExtraccionK);
        
        // Establecer la visibilidad según el estado del checkbox
        this.geojsonLayerExtraccionK.visible = this.extraccionKChecked.value ?? false;
        console.log('Visibilidad de la capa de extracción de K:', this.geojsonLayerExtraccionK.visible);
  
        // Zoom a la capa cuando esté lista
        this.geojsonLayerExtraccionK.when(() => {
          console.log('Capa de extracción de K cargada completamente');
         
        });
  
        // Limpiar el URL del Blob después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          console.log('Blob URL de extracción de K liberada');
        }, 5000);
      })
      .catch(error => {
        console.error('Error al cargar la capa de extracción de K:', error);
        this.toast.error('Error al cargar la extracción de K por ambiente');
      });
  } 
  cargarExtraccionAmbienteN(): void {
    if (!this.idCultivo) {
      console.log('No hay ID de cultivo');
      return;
    }
  
    console.log('Cargando extracción de N por ambiente para cultivo:', this.idCultivo);
    const url = `http://api.proyecto.local/extraccion-n-ambiente-geojson/${this.idCultivo}`;
  
    // Si ya existe una capa, la removemos
    if (this.geojsonLayerExtraccionN) {
      console.log('Removiendo capa existente de extracción de N');
      this.map.remove(this.geojsonLayerExtraccionN);
    }
  
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Datos recibidos de extracción de N:', data);
  
        if (!data.features || data.features.length === 0) {
          console.warn('No hay features en los datos de extracción de N');
          this.toast.warning('No hay datos de extracción de N por ambiente disponibles');
          return;
        }
  
        // Crear el GeoJSON
        const blob = new Blob([JSON.stringify(data)], {
          type: 'application/json'
        });
        const blobUrl = URL.createObjectURL(blob);
  
        this.geojsonLayerExtraccionN = new GeoJSONLayer({
          url: blobUrl,
          title: 'Extracción de N por Ambiente',
          outFields: ['*'],
          geometryType: "polygon",
          spatialReference: { wkid: 4326 },
          renderer: new SimpleRenderer({
            symbol: new SimpleFillSymbol({
              style: 'solid',
              color: [255, 255, 255, 0.4],
              outline: {
                color: [0, 0, 0, 1],
                width: 1
              }
            }),
            visualVariables: [{
              type: 'color',
              field: 'extraccion_n',  // Usar extraccion_n aquí
              stops: [
                { value: 0, color: [255, 255, 255, 0.7] },     // Blanco para valores bajos
                { value: data.percentiles.p40, color: [200, 255, 200, 0.7] },  // Verde claro
                { value: data.percentiles.p60, color: [100, 255, 100, 0.7] },  // Verde medio
                { value: data.percentiles.p80, color: [0, 255, 0, 0.7] }       // Verde intenso para valores altos
              ]
            } as esri.ColorVariableProperties]
          }),
          labelingInfo: [{
            symbol: {
              type: "text",
              color: "black",
              haloColor: "white",
              haloSize: "2px",
              font: {
                size: 12,
                family: "Arial",
                weight: "bold"
              }
            },
            labelPlacement: "center-center",
            labelExpressionInfo: {
              expression: "Round($feature.extraccion_n, 2) + ' kg de N/ha'"  // Usar extraccion_n aquí
            }
          }]
        });
  
        console.log('Capa de extracción de N creada, agregando al mapa...');
        this.map.add(this.geojsonLayerExtraccionN);
  
        // Establecer la visibilidad según el estado del checkbox
        this.geojsonLayerExtraccionN.visible = this.extraccionNChecked.value ?? false;
        console.log('Visibilidad de la capa de extracción de N:', this.geojsonLayerExtraccionN.visible);
  
        // Zoom a la capa cuando esté lista
        this.geojsonLayerExtraccionN.when(() => {
          console.log('Capa de extracción de N cargada completamente');
        });
  
        // Limpiar el URL del Blob después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          console.log('Blob URL de extracción de N liberada');
        }, 5000);
      })
      .catch(error => {
        console.error('Error al cargar la capa de extracción de N:', error);
        this.toast.error('Error al cargar la extracción de N por ambiente');
      });
  }  
  cargarCoeficienteVariacionAmbiente(): void {
    if (!this.idCultivo) {
        console.log('No hay ID de cultivo');
        return;
    }
  
    console.log('Cargando coeficiente de variación para cultivo:', this.idCultivo);
    const url = `http://api.proyecto.local/coeficiente_variacion_geojson/${this.idCultivo}`;
    
    // Remover la capa existente si ya está cargada
    if (this.geojsonLayerCoeficienteVariacion) {
        console.log('Removiendo capa existente');
        this.map.remove(this.geojsonLayerCoeficienteVariacion);
    }
  
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data);
  
            if (!data.features || data.features.length === 0) {
                console.warn('No hay features en los datos');
                this.toast.warning('No hay datos de coeficiente de variación por ambiente disponibles');
                return;
            }
  
            // Crear un Blob con los datos
            const blob = new Blob([JSON.stringify(data)], {
                type: 'application/json'
            });
  
            const blobUrl = URL.createObjectURL(blob);
  
            // Crear la capa
            this.geojsonLayerCoeficienteVariacion = new GeoJSONLayer({
                url: blobUrl,
                title: 'Coeficiente de Variación por Ambiente',
                outFields: ['*'],
                geometryType: "polygon",
                spatialReference: { wkid: 4326 },
                renderer: new SimpleRenderer({
                    symbol: new SimpleFillSymbol({
                        style: 'solid',
                        color: [255, 255, 255, 0.4],
                        outline: {
                            color: [0, 0, 0, 1],
                            width: 1
                        }
                    }),

                    visualVariables: [{
                      type: 'color',
                      field: 'coeficiente_variacion_real',
                      stops: [
                        { value: 0, color: [0, 128, 0, 0.7] },      // Verde oscuro para 0-10%
                        { value: 10, color: [0, 128, 0, 0.7] },
                        { value: 10.01, color: [144, 238, 144, 0.7] }, // Verde claro para 10-20%
                        { value: 20, color: [144, 238, 144, 0.7] },
                        { value: 20.01, color: [255, 255, 0, 0.7] },   // Amarillo para 20-30%
                        { value: 30, color: [255, 255, 0, 0.7] },
                        { value: 30.01, color: [255, 165, 0, 0.7] },   // Anaranjado para 30-40%
                        { value: 40, color: [255, 165, 0, 0.7] },
                        { value: 40.01, color: [255, 0, 0, 0.7] }      // Rojo para valores superiores a 40%
                      ]
                    } as esri.ColorVariableProperties]
                  }),
              
                labelingInfo: [{
                    symbol: {
                        type: "text",
                        color: "black",
                        haloColor: "white",
                        haloSize: "2px",
                        font: {
                            size: 12,
                            family: "Arial",
                            weight: "bold"
                        }
                    },
                    labelPlacement: "center-center",
                    labelExpressionInfo: {
                        expression: "Round($feature.coeficiente_variacion_real, 2) + ' %'"
                    }
                }],
            });
  
            this.map.add(this.geojsonLayerCoeficienteVariacion);
  
            this.geojsonLayerCoeficienteVariacion.visible = true;
            console.log('Capa de coeficiente de variación agregada al mapa');
  
            this.geojsonLayerCoeficienteVariacion.when(() => {
                if (this.geojsonLayerCoeficienteVariacion && this.geojsonLayerCoeficienteVariacion.fullExtent) {
                    this.view.goTo(this.geojsonLayerCoeficienteVariacion.fullExtent);
                }
            });
  
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                console.log('Blob URL liberada');
            }, 5000);
        })
        .catch(error => {
            console.error('Error al cargar la capa de coeficiente de variación:', error);
            this.toast.error('Error al cargar el coeficiente de variación por ambiente');
        });
  }
//Descargar archivos
  descargarShapefileRendimientoAmbiente() {
    if (this.cultivo && this.cultivo.nombre) {
      this.cultivoService.descargarShapefileRendimientoAmbiente(this.idCultivo, this.cultivo.nombre);
    } else {
      console.error('Cultivo o nombre del cultivo no disponible');
    }
  }
  descargarShapefilePorCultivo() {
    if (this.idCampo) { 
      this.cultivoService.descargarShapefilePorCultivo(this.idCampo);
    } else {
      console.error('ID de campo no disponible');
    }
  }
  descargarShapefilePorCultivoData() {
    this.cultivoService.descargarShapefilePorCultivoData(this.idCultivo);
  }
  descargarShapefileExtraccionP() {
    this.cultivoService.descargarShapefileExtraccionP(this.idCultivo);
  }
  descargarShapefileExtraccionK() {
    this.cultivoService.descargarShapefileExtraccionK(this.idCultivo);
  }
  descargarShapefileExtraccionN() {
    this.cultivoService.descargarShapefileExtraccionN(this.idCultivo);
  }
  calcularYDescargarExcel(): void {
    const cultivoId = this.cultivo?.id;

    if (!cultivoId) {
        console.error('No hay un cultivo seleccionado');
        return;
    }

    // Primero calculamos el rendimiento
    this.cultivoService.calcularRendimientoAmbiente(cultivoId).subscribe({
        next: () => {
            // Una vez calculado, procedemos a descargar el Excel
            this.cultivoService.descargarExcelRendimiento(cultivoId).subscribe({
                next: (response: HttpResponse<Blob>) => {
                    // Obtener el nombre del archivo del header Content-Disposition
                    const contentDisposition = response.headers.get('Content-Disposition');
                    let filename = 'rendimiento_ambiente.xlsx';
                    
                    if (contentDisposition) {
                        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }

                    // Crear blob y descargar
                    const blob = new Blob([response.body as Blob], { 
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.click();
                    
                    // Limpieza
                    window.URL.revokeObjectURL(url);
                    link.remove();
                },
                error: (error) => {
                    console.error('Error al descargar el archivo Excel:', error);
                }
            });
        },
        error: (error) => {
            console.error('Error al calcular el rendimiento:', error);
        }
    });
}
//Mostrar y ocultar
  toggleLayerMapaRendimiento(): void {
    if (this.cultivoDataLayerMapaRendimiento) {
      this.cultivoDataLayerMapaRendimiento.visible = this.mapaRendimientoChecked.value ?? false;
      this.showPercentileTable = this.mapaRendimientoChecked.value ?? false;

    }
  }
  toggleLayerMBA(): void {
    if (this.geojsonLayerMBA) {
      this.geojsonLayerMBA.visible = this.mbaChecked.value ?? false;
    }
  }
  toggleLayerRendimientoAmbiente(): void {
    if (this.cultivoDataLayerMapaRendimiento) {
      this.cultivoDataLayerMapaRendimiento.visible = this.mapaRendimientoChecked.value ?? false;
  
    
    }
  }
  toggleLayerAjusteMBA(): void {
    console.log('toggleLayerAjusteMBA');
  }
  toggleLayerRendimientoMBA(): void {
    console.log('Toggle rendimiento MBA:', this.rendimientoAmbienteChecked.value);
    
    // Si la capa no existe, intentamos cargarla primero
    if (!this.geojsonLayerRendimientoAmbiente) {
        console.log('Capa no inicializada, cargando...');
        this.cargarRendimientoAmbiente();
        return;
    }

    // Si la capa existe, cambiamos su visibilidad
    this.geojsonLayerRendimientoAmbiente.visible = this.rendimientoAmbienteChecked.value ?? false;
    console.log('Capa visible:', this.geojsonLayerRendimientoAmbiente.visible);
  }
  toggleLayerCoeficienteVariacion(): void {
    if (this.geojsonLayerCoeficienteVariacion) {
      this.geojsonLayerCoeficienteVariacion.visible = this.ajusteMBAChecked.value ?? false;
    } else {
      this.cargarCoeficienteVariacionAmbiente();
    }
  }
  toggleLayerExtraccionP(): void {
    if (this.geojsonLayerExtraccionP) {
      this.geojsonLayerExtraccionP.visible = this.extraccionPChecked.value ?? false;
    } else {
      this.cargarExtraccionAmbienteP();
    }
  }  
  toggleLayerExtraccionK(): void {
    if (this.geojsonLayerExtraccionK) {
      this.geojsonLayerExtraccionK.visible = this.extraccionKChecked.value ?? false;
    } else {
      this.cargarExtraccionAmbienteK();
    }
  }
  toggleLayerExtraccionN(): void {
    if (this.geojsonLayerExtraccionN) {
      this.geojsonLayerExtraccionN.visible = this.extraccionNChecked.value ?? false;
    } else {
      this.cargarExtraccionAmbienteN();
    }
  }
}
