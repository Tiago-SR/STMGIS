from django.shortcuts import render
from django.contrib.gis.geos import Polygon, MultiPolygon

from cultivo.models import Cultivo
from .models import Ambiente
from campo.models import Campo
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, generics
from rest_framework_gis.filters import InBBOXFilter
from rest_framework_gis.serializers import GeoFeatureModelSerializer
import shapefile
import zipfile
import json
from django.core.serializers import serialize
from django.http import HttpResponse, JsonResponse, Http404
from tempfile import NamedTemporaryFile
from .serializers import AmbienteSerializer
import logging

logger = logging.getLogger(__name__)

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


def download_shapefile_ambiente(request, campo_id):
    try:
        campo = Campo.objects.get(id=campo_id)
        ambientes = Ambiente.objects.filter(campo_id=campo_id)
        if not ambientes.exists():
            raise Http404("No se encontraron ambientes para el campo especificado.")
    except Ambiente.DoesNotExist:
        raise Http404("Campo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                # Crear el shapefile con el autoBalance activado
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1
                    shp_writer.field("Name", "C", size=100)
                    shp_writer.field("Area", "F", decimal=2)
                    shp_writer.field("IA", "N", decimal=0)
                    shp_writer.field("Lote", "C", size=100)
                    shp_writer.field("SistProd", "C", size=100)
                    shp_writer.field("Zona", "C", size=100)
                    shp_writer.field("TipoSuelo", "N", decimal=0)
                    shp_writer.field("Posicion", "C", size=100)
                    shp_writer.field("Prof", "C", size=100)
                    shp_writer.field("Restriccion", "C", size=100)
                    shp_writer.field("Ambiente", "C", size=100)
                    shp_writer.field("ID_A", "N", decimal=0)

                    for ambiente in ambientes:
                        if ambiente.ambiente_geom:
                            polygons = [ambiente.ambiente_geom] if ambiente.ambiente_geom.geom_type == 'Polygon' else list(ambiente.ambiente_geom)
                            for polygon in polygons:
                                coords = [[(x, y) for x, y in ring] for ring in polygon]
                                shp_writer.poly(coords)
                                shp_writer.record(
                                    Name=ambiente.name or '',
                                    Area=ambiente.area or 0,
                                    IA=ambiente.ia or 0,
                                    Lote=ambiente.lote or '',
                                    SistProd=ambiente.sist_prod or '',
                                    Zona=ambiente.zona or '',
                                    TipoSuelo=ambiente.tipo_suelo or 0,
                                    Posicion=ambiente.posicion or '',
                                    Prof=ambiente.prof or '',
                                    Restriccion=ambiente.restriccion or '',
                                    Ambiente=ambiente.ambiente or '',
                                    ID_A=ambiente.idA or 0
                                )

                campo_nombre = campo.nombre.replace(" ", "_")               
                # Agregar los archivos SHP, DBF y SHX al ZIP
                zip_file.write(shp_file.name, f"Mapa_Ambientes_{campo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Mapa_Ambientes_{campo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Mapa_Ambientes_{campo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Mapa_Ambientes_{campo_nombre}.zip"'
        return response