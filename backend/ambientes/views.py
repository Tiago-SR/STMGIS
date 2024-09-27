from django.shortcuts import render
from django.contrib.gis.geos import Polygon, MultiPolygon
from .models import Ambiente
from campo.models import Campo
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# import shapefile




# def handle_uploaded_shapefile(shp, shx, dbf, request):
#     # Abrir el shapefile
#     try:
#         with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
#             for shapeRecord in sf.shapeRecords():
#                 # La geometría del ambiente
#                 geom = shapeRecord.shape.__geo_interface__
#                 poly = Polygon(geom['coordinates'][0]) if geom['type'] == 'Polygon' else MultiPolygon([Polygon(poly) for poly in geom['coordinates']])

#                 # Intenta encontrar el campo asociado
#                 campo_id = shapeRecord.record.get('Campo')  # Asegúrate de manejar casos donde 'Campo' podría no existir
#                 campo = Campo.objects.filter(id=campo_id).first()
#                 if not campo:
#                     continue  # Saltar este registro si no existe el campo

#                 # Crear un nuevo objeto Ambiente con los datos extraídos
#                 Ambiente.objects.create(
#                     campo=campo,
#                     datos={field: shapeRecord.record[idx] for idx, field in enumerate(sf.fields[1:])},  # Extract all other fields dynamically
#                     ambiente_geom=poly
#                 )
#     except Exception as e:
#         print(f"Error al procesar el shapefile: {e}")
#         raise Exception("Error processing the shapefile desde ambiente: " + str(e))  # Esto permitirá que el error sea manejado más adelante

def handle_uploaded_shapefile(shp, shx, dbf, request):
    try:
        with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
            for shapeRecord in sf.shapeRecords():
                geom = shapeRecord.shape.__geo_interface__
                if geom['type'] == 'Polygon':
                    poly = Polygon(geom['coordinates'][0])
                elif geom['type'] == 'MultiPolygon':
                    poly = MultiPolygon([Polygon(poly) for poly in geom['coordinates']])
                
                # Transforma la geometría a EPSG:4326 si es necesario
                if geom.srid != 4326:
                    geom.transform(4326)
                
                campo_id = shapeRecord.record.get('Campo')
                campo = Campo.objects.filter(id=campo_id).first()
                if not campo:
                    continue

                Ambiente.objects.create(
                    campo=campo,
                    datos={field: shapeRecord.record[idx] for idx, field in enumerate(sf.fields[1:])},
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
