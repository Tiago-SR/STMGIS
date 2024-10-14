
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
    this.initMap();
    this.cultivoId = this.route.snapshot.params['id']; // Obtener el cultivoId de la URL
    this.cargarDatosNormalizacion(); 
     
  }  
  //  ngAfterViewChecked(): void {
  //    // Intentar inicializar el mapa si aún no se ha inicializado
  //  if (!this.mapInitialized && document.getElementById('viewDiv')) {
  //      this.initMap();
  //      this.mapInitialized = true; // Marcamos como inicializado para evitar múltiples intentos
      
  //    }
  // }

  
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
    }).catch((error) => {
      console.error('Error al inicializar el mapa: ', error);
    });
  }


  cargarDatosNormalizacion() {
    // Llamar al backend para obtener los mapas de rendimiento y los coeficientes iniciales
    this.cultivoService.obtenerDatosNormalizacion(this.cultivoId).subscribe(
      response => {
        console.log('Respuesta recibida:', response); 

        this.cultivo = response.cultivo;
        this.mapas = [response.mapa1, response.mapa2];
        console.log('Mapas asignados:', this.mapas);
        console.log('Coeficiente de ajuste recibido:', response.coeficiente_ajuste);


      //  this.coeficientes[this.currentPairIndex + 1] = response.coeficiente_ajuste;

        console.log('GeoJSON Data:', this.mapas[0]);
        this.addNormalizedMapLayer(this.mapas);
        
        this.cd.detectChanges();

      },
      error => {
        this.toastr.error('Error al cargar los datos para la normalización', 'Error');
        console.error('Error al cargar los datos para la normalización:', error);
      }
    );
  }

   addNormalizedMapLayer(geojsonData: any[]): void {
    if (!this.map) {
      console.error('El mapa no está inicializado.');
      return;
    }

    // Limpiar todas las capas previas del mapa
    this.map.layers.removeAll();

    geojsonData.forEach((data, index) => {
      const geoJsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const geoJsonUrl = URL.createObjectURL(geoJsonBlob);
      console.log('GeoJSON URL:', geoJsonUrl);
      const geoJsonLayer = new GeoJSONLayer({
        url: geoJsonUrl,
        title: `Mapa Normalizado ${index + 1}`,
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
        });
      }).catch((error) => {
        console.error('Error al cargar la capa GeoJSON:', error);
      });
    });
  }



  ajustarCoeficiente(value: number) {
    let nuevoValor = this.ajusteForm.get('coeficienteAjuste')?.value + value;
    if (nuevoValor < 0) {
      nuevoValor = 0; // Evitar coeficiente negativo
    }
    this.ajusteForm.patchValue({ coeficienteAjuste: nuevoValor });
  }

  confirmarNormalizacion() {
    if (this.currentPairIndex >= this.mapas.length - 1) {
      this.toastr.warning('No hay más mapas para normalizar', 'Proceso finalizado');
      return;
    }
  
    const coeficienteAjuste = this.ajusteForm.get('coeficienteAjuste')?.value;
    this.coeficientes[this.currentPairIndex + 1] *= coeficienteAjuste;
  
    // Corregir: agregar el coeficienteAjuste como argumento
    this.cultivoService.confirmarNormalizacion(this.cultivo.id, coeficienteAjuste).subscribe(
      response => {
        this.toastr.success('Normalización confirmada para el par de mapas', 'Éxito');
        this.currentPairIndex++;
        this.actualizarFormulario();
      },
      error => {
        this.toastr.error('Error al confirmar la normalización', 'Error');
        console.error('Error al confirmar la normalización:', error);
      }
    );
  }
  actualizarFormulario() {
    if (this.currentPairIndex < this.mapas.length - 1) {
      this.ajusteForm.patchValue({ coeficienteAjuste: 1 }); // Reiniciar el coeficiente para el siguiente par
      this.cargarDatosNormalizacion(); // Cargar el siguiente par de mapas

    } else {
      this.toastr.info('Se han procesado todos los pares de mapas', 'Proceso completo');
      this.router.navigate(['/resultado-normalizacion']); // Redirigir a la vista de resultados
    }
  }

}