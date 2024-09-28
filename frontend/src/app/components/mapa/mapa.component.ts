import { Component, OnInit } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import WMSLayer from '@arcgis/core/layers/WMSLayer';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss']
})
export class MapaComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    const map = new Map({
      basemap: 'streets'
    });

    const view = new MapView({
      container: 'viewDiv',
      map: map,
      center: [-56.51761970016188 , -34.06439532971759,-56.517936852294724 ],
      zoom: 10
    });

    const wmsLayer = new WMSLayer({
      url: 'http://localhost:8081/geoserver/stmgis_workspace/wms',
      sublayers: [
        {
          name: 'stmgis_workspace:ambientes_ambiente'
        }
      ]
    });

    map.add(wmsLayer);
  }
}
