from django.shortcuts import render
from django.contrib.gis.geos import Polygon, MultiPolygon
from .models import  Ambiente
from campo.models import Campo
from django.http import JsonResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import shapefile

def handle_uploaded_shapefile(shp, shx, dbf):
    # Abrir el shapefile
    try:
        with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
            for shapeRecord in sf.shapeRecords():
                # La geometría del ambiente
                geom = shapeRecord.shape.__geo_interface__
                poly = Polygon(geom['coordinates'][0]) if geom['type'] == 'Polygon' else MultiPolygon([Polygon(poly) for poly in geom['coordinates']])

                # Intenta encontrar el campo asociado
                try:
                    campo_id = int(shapeRecord.record['Campo'])
                    campo = Campo.objects.get(id=campo_id)
                except Campo.DoesNotExist:
                    continue  # o maneja el error como prefieras

                # Crear un nuevo objeto Ambiente con todos los campos
                ambiente = Ambiente(
                    name=shapeRecord.record['Name'],
                    ia=shapeRecord.record['IA'],
                    area=shapeRecord.record['Area'],
                    empresa=shapeRecord.record['Empresa'],
                    campo=campo,
                    zona=shapeRecord.record['Zona'],
                    posicion=shapeRecord.record['Posicion'],
                    profundidad=shapeRecord.record['Prof'],
                    restriccion=shapeRecord.record.get('Restriccio', ''),  # Uso de .get por si es None
                    has_siembra=shapeRecord.record['hasSiembra'],
                    sist_prod=shapeRecord.record['SistProd'],
                    tipo_suelo=shapeRecord.record['TipoSuelo'],
                    ambiente_geom=poly
                )
                ambiente.save()
    except Exception as e:
        # Manejar cualquier excepción que pueda ocurrir durante la lectura del archivo o procesamiento de datos
        print(f"Error al procesar el shapefile: {e}")

class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        shp_file = request.FILES.get('shp')
        shx_file = request.FILES.get('shx')
        dbf_file = request.FILES.get('dbf')
        
        if shp_file and shx_file and dbf_file:
            try:
                handle_uploaded_shapefile(shp_file, shx_file, dbf_file)
                return Response(status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(str(e), status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response('Missing files', status=status.HTTP_400_BAD_REQUEST)