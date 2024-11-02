from django.shortcuts import render
from django.contrib.gis.geos import Polygon, MultiPolygon
from .models import Ambiente
from campo.models import Campo
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, generics
from rest_framework_gis.filters import InBBOXFilter
from rest_framework_gis.serializers import GeoFeatureModelSerializer
import shapefile
import json
from django.core.serializers import serialize
from django.http import JsonResponse
from .serializers import AmbienteSerializer

def ambiente_geojson_view(request):
    campo_id = request.GET.get('campo_id', None)
    
    if campo_id:
        queryset = Ambiente.objects.filter(campo__id=campo_id)
    else:
        queryset = Ambiente.objects.all()

    geojson_str = serialize(
        "geojson",
        queryset,
        geometry_field="ambiente_geom",
        fields=["name", "area", "ia", "lote", "sist_prod", "zona", "tipo_suelo", "posicion", "prof", "restriccion", "ambiente", "idA", "is_active"]
    )

    geojson = json.loads(geojson_str)

    return JsonResponse(geojson)

def ambiente_geojson_por_cultivo_view(request):
    cultivo_id = request.GET.get('cultivo_id', None)
    
    if cultivo_id:
        cultivo = Cultivo.objects.filter(id=cultivo_id).first()
        if cultivo:
            campo_id = cultivo.campo_id
            queryset = Ambiente.objects.filter(campo__id=campo_id)
        else:
            queryset = Ambiente.objects.none()
    else:
        queryset = Ambiente.objects.all()
    geojson_str = serialize(
        "geojson",
        queryset,
        geometry_field="ambiente_geom",
        fields=["name", "area", "ia", "lote", "sist_prod", "zona", "tipo_suelo", "posicion", "prof", "restriccion", "ambiente", "idA", "is_active"]
    )

    geojson = json.loads(geojson_str)

    return JsonResponse(geojson)

def handle_uploaded_shapefile(shp, shx, dbf, request):
    try:
        with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
            for shapeRecord in sf.shapeRecords():
                geom = shapeRecord.shape.__geo_interface__
                
                if not geom['coordinates']:
                    continue  # Saltar geometrías vacías
                
                if geom['type'] == 'Polygon':
                    poly = Polygon(geom['coordinates'][0])
                elif geom['type'] == 'MultiPolygon':
                    poly = MultiPolygon([Polygon(poly_coords[0]) for poly_coords in geom['coordinates']])

                if poly.srid != 4326:
                    poly.srid = 4326
                    poly.transform(4326)

                campo_id = shapeRecord.record.get('Campo')
                campo = Campo.objects.filter(id=campo_id).first()
                if not campo:
                    continue

                Ambiente.objects.create(
                    campo=campo,
                    name = shapeRecord.record.get('Name'),
                    area = shapeRecord.record.get('Area'),
                    ia = shapeRecord.record.get('IA'),
                    lote = shapeRecord.record.get('Lote'),
                    sist_prod = shapeRecord.record.get('Sist_prod'),
                    zona = shapeRecord.record.get('Zona'),
                    tipo_suelo = shapeRecord.record.get('Tipo_suelo'),
                    posicion = shapeRecord.record.get('Posicion'),
                    prof = shapeRecord.record.get('Prof'),
                    restriccion = shapeRecord.record.get('Restriccion'),
                    ambiente = shapeRecord.record.get('Ambiente'),
                    idA = shapeRecord.record.get('ID'),
                    #datos={field: shapeRecord.record[idx] for idx, field in enumerate(sf.fields[1:])},
                    ambiente_geom=poly
                )
    except Exception as e:
        print(f"Error al procesar el shapefile: {e}")
        raise Exception("Error processing the shapefile: " + str(e))



class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        shp_file = request.FILES.get('shp')
        shx_file = request.FILES.get('shx')
        dbf_file = request.FILES.get('dbf')

        if shp_file and shx_file and dbf_file:
            try:
                handle_uploaded_shapefile(shp_file, shx_file, dbf_file, request)
                return Response({"message": "Shapefiles successfully processed and data stored."}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Missing files. Please ensure that SHP, SHX, and DBF files are included in the request."}, status=status.HTTP_400_BAD_REQUEST)
