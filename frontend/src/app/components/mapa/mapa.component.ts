import { Component, OnInit } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import esri = __esri;
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import { CampoService } from '../../services/campo.service';
import { Campo } from '../../models/campo.model';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';


@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss']
})
export class MapaComponent implements OnInit {
  map!: Map;
  view!: MapView;
  geojsonLayer!: GeoJSONLayer;
  cultivoDataLayer!: GeoJSONLayer;
  campos: Campo[] = [];
  selectedUuid: string = '';
  originalSymbol: esri.Symbol | null = null;
  highlightedGraphic: esri.Graphic | null = null;

  constructor(private campoService: CampoService) { }

  ngOnInit(): void {
    this.map = new Map({
      basemap: 'hybrid'
    });

    this.view = new MapView({
      container: 'viewDiv',
      map: this.map,
      center: [-56.0698, -32.4122], 
      zoom: 8
    });

    this.loadCampos();

    this.view.on('pointer-move', (event) => {
      this.displayFeatureInfo(event);
    });
  }

  loadCampos() {
    this.campoService.getCampos().subscribe({
      next: (response) => {
        if (response.success) {
          this.campos = response.data;
        } else {
          console.error('No se pudieron cargar todos los campos')
          this.campos = [];
        }
      },
      error: (error) => {
        console.error('Error al cargar todos los campos', error);
        this.campos = [];
      }
    });
  }

  onCampoSelected(uuid: string): void {
    this.selectedUuid = uuid;

    if(!uuid){
      if (this.geojsonLayer) {
        this.map.remove(this.geojsonLayer);
      }
      this.view.goTo({
        center: [-56.0698, -32.4122],
        zoom: 8
      });
      this.removeHighlight();
      return;
    }
  
    const geojsonUrl = `http://api.proyecto.local/geojson/?campo_id=${uuid}`;
  
    if (this.geojsonLayer) {
      this.map.remove(this.geojsonLayer);
    }
  
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
  
    this.geojsonLayer = new GeoJSONLayer({
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
  
    this.map.add(this.geojsonLayer);
  
    this.geojsonLayer.when(() => {
      this.geojsonLayer.queryFeatures().then((featureSet) => {
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

  displayFeatureInfo(event: any) {
    this.view.hitTest(event, { include: this.geojsonLayer }).then((response: esri.HitTestResult) => {
      const tooltipElement = document.getElementById('tooltip');
      if (!tooltipElement) {
        return;
      }

      if (response.results.length > 0) {
        const graphicHit = response.results.find((result): result is esri.GraphicHit => {

          return result.type === 'graphic' && (result as esri.GraphicHit).graphic.layer === this.geojsonLayer;
        });

        if (graphicHit && graphicHit.graphic) {
          const graphic = graphicHit.graphic;
          const nombre = graphic.getAttribute('ambiente');
          tooltipElement.style.display = 'block';
          tooltipElement.style.left = event.x + 15 + 'px';
          tooltipElement.style.top = event.y + 15 + 'px';
          tooltipElement.innerHTML = nombre || 'Sin nombre';

          this.highlightFeature(graphic);
        } else {
          tooltipElement.style.display = 'none';
          this.removeHighlight();
        }
      } else {
        tooltipElement.style.display = 'none';
        this.removeHighlight();
      }
    });
  }

  onCargarCsv(): void {
    if (!this.selectedUuid) {
      return;
    }
  
    const cultivoDataUrl = `http://api.proyecto.local/cultivodata-geojson/?campo_id=${this.selectedUuid}`;
  
    if (this.cultivoDataLayer) {
      this.map.remove(this.cultivoDataLayer);
    }
  
    // Definir los valores mínimo y máximo para 'prod'
    const minProdValue = 0; // Ajusta este valor según tus datos
    const maxProdValue = 10; // Ajusta este valor según tus datos
  
    this.cultivoDataLayer = new GeoJSONLayer({
      url: cultivoDataUrl,
      title: 'Cultivo Data',
      outFields: ['*'],
      renderer: new SimpleRenderer({
        symbol: new SimpleMarkerSymbol({
          style: 'circle',
          color: 'blue', // Será sobrescrito por visualVariables
          size: '8px',
          outline: {
            color: [255, 255, 0],
            width: 1
          }
        }),
        visualVariables: [
          {
            type: 'color',
            field: 'prod',
            stops: [
              { value: minProdValue, color: 'red' },
              { value: (minProdValue + maxProdValue) / 2, color: 'yellow' },
              { value: maxProdValue, color: 'green' }
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
    
  
    this.map.add(this.cultivoDataLayer);
  
    // Opcional: ajustar la vista para incluir ambas capas
    Promise.all([this.geojsonLayer.when(), this.cultivoDataLayer.when()]).then(() => {
      this.view.goTo({
        target: [
          this.geojsonLayer.fullExtent
        ],
        options: { duration: 1000, easing: 'ease-in-out' }
      });
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
}
