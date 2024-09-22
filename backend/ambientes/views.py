from django.shortcuts import render

# Create your views here.
import shapefile
from django.contrib.gis.geos import Polygon, MultiPolygon

def handle_uploaded_shapefile(shp, shx, dbf):
    # Abrir el shapefile
    with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
        for shapeRecord in sf.shapeRecords():
            # La geometría del ambiente
            geom = shapeRecord.shape.__geo_interface__
            poly = Polygon(geom['coordinates'][0])  # Asegúrate de ajustar a MultiPolygon si es necesario

            # Crear un nuevo objeto Ambiente con todos los campos
            ambiente = ambiente(
                name=shapeRecord.record['Name'],
                ia=shapeRecord.record['IA'],
                area=shapeRecord.record['Area'],
                empresa=shapeRecord.record['Empresa'],
                campo=shapeRecord.record['Campo'],
                zona=shapeRecord.record['Zona'],
                posicion=shapeRecord.record['Posicion'],
                profundidad=shapeRecord.record['Prof'],
                restriccion=shapeRecord.record.get('Restriccio'),  # Uso de .get por si es None
                has_siembra=shapeRecord.record['hasSiembra'],
                sist_prod=shapeRecord.record['SistProd'],
                tipo_suelo=shapeRecord.record['TipoSuelo'],
                ambiente_geom=poly
            )
            ambiente.save()
