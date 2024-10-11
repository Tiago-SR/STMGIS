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
  p19: number = 0;
  p39: number = 0;
  p59: number = 0;
  p79: number = 0;
  p100: number = 0;

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

    this.selectedUuid = uuid;

    if (!uuid) {
      this.p19 = 0;
      this.p39 = 0;
      this.p59 = 0;
      this.p79 = 0;
      this.p100 = 0;
  
      if (this.geojsonLayer) {
        this.map.remove(this.geojsonLayer);
      }
  
      if (this.cultivoDataLayer) {
        this.map.remove(this.cultivoDataLayer);
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
  
        this.cultivoDataLayer = new GeoJSONLayer({
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
  
        this.map.add(this.cultivoDataLayer);
      })
      .catch(error => {
        console.error('Error al cargar los datos del GeoJSON:', error);
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
