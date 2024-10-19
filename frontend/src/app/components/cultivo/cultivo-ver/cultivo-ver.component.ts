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
  cultivoDataLayerMapaRendimiento!: GeoJSONLayer;
  highlightedGraphic: esri.Graphic | null = null;
  originalSymbol: esri.Symbol | null = null;

  // Checkbox's controls
  mapaRendimientoChecked = new FormControl(false);
  mbaChecked = new FormControl(false);
  rendimientoAmbienteChecked = new FormControl(false);
  ajusteMBAChecked = new FormControl(false);


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
    private cultivoService: CultivoService
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
                  this.cargarCampo()
                  this.cargarMapaRendimiento()
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

  cargarMapaRendimiento(): void {
    if (!this.idCampo) {
      return;
    }
  
    const cultivoDataUrl = `http://api.proyecto.local/cultivodata-geojson/?campo_id=${this.idCampo}`;
  
    if (this.cultivoDataLayerMapaRendimiento) {
      this.map.remove(this.cultivoDataLayerMapaRendimiento);
    }
  
    // Obtener los datos del GeoJSON desde el endpoint
    fetch(cultivoDataUrl)
      .then(response => response.json())
      .then(data => {
        const rendimientos = data.features.map((feature: any) => feature.properties.rendimiento_relativo);
  
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
          outFields: ['*'],
          renderer: new SimpleRenderer({
            symbol: new SimpleMarkerSymbol({
              style: 'circle',
              color: 'blue',
              size: '8px',
              outline: {
                color: [255, 255, 0],
                width: 1
              }
            }),
            visualVariables: [
              {
                type: 'color',
                field: 'rendimiento_relativo',
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
                  { fieldName: 'prod', label: 'Prod' }
                ]
              }
            ]
          }
        });
  
        this.map.add(this.cultivoDataLayerMapaRendimiento);
      })
      .catch(error => {
        console.error('Error al cargar los datos del GeoJSON:', error);
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

  toggleLayerMapaRendimiento(): void {
    if (this.cultivoDataLayerMapaRendimiento) {
      this.cultivoDataLayerMapaRendimiento.visible = this.mapaRendimientoChecked.value ?? false;
    }
  }

  toggleLayerMBA(): void {
    if (this.geojsonLayerMBA) {
      this.geojsonLayerMBA.visible = this.mbaChecked.value ?? false;
    }
  }

  toggleLayerRendimientoAmbiente(): void {
    console.log('toggleLayerRendimientoAmbiente');
  }
  toggleLayerAjusteMBA(): void {
    console.log('toggleLayerAjusteMBA');
  }
}
