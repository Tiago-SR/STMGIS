# Create your views here.
from rest_framework import viewsets
from campo.models import Campo
from campo.serializers import CampoSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.gis.geos import Polygon, MultiPolygon
from ambientes.models import Ambiente
from rest_framework import viewsets
from campo.models import Campo
from campo.serializers import CampoSerializer
from django.contrib.gis.geos import GEOSGeometry
import shapefile
from django.db import transaction




class CampoViewSet(viewsets.ModelViewSet):
    queryset = Campo.objects.filter(is_active=True)
    serializer_class = CampoSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Permite JSON y multipart
    def list(self, request):        
        empresa_id = request.query_params.get('empresa')  # Obtiene el parámetro de la consulta
        if empresa_id:
            print("Empresa ID recibido:", empresa_id)
            try:
                campos = Campo.objects.filter(empresa_id=empresa_id, is_active=True)
                if campos.exists():
                    serializer = CampoSerializer(campos, many=True)                    
                    return Response({'data': serializer.data, 'success': True})
                else:
                    return Response({'message': 'No hay campos para esta empresa.'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            campos = Campo.objects.filter(is_active=True)
            serializer = CampoSerializer(campos, many=True)
            return Response({'data': serializer.data, 'success': True}, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                campo = serializer.save()

                shp_file = request.FILES.get('shpFile')
                shx_file = request.FILES.get('shxFile')
                dbf_file = request.FILES.get('dbfFile')

                if shp_file and shx_file and dbf_file:
                    try:
                        self.handle_uploaded_shapefile(shp_file, shx_file, dbf_file, campo)
                        return Response(serializer.data, status=status.HTTP_201_CREATED)
                    except Exception as e:
                        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"error": "Missing shapefile components desde view campo"}, status=status.HTTP_400_BAD_REQUEST)

    def handle_uploaded_shapefile(self, shp, shx, dbf, campo):
        try:
            with shapefile.Reader(shp=shp, shx=shx, dbf=dbf) as sf:
                fields = sf.fields[1:]  # Omite el primer campo, que usualmente es un campo de borrado
                field_names = [field[0] for field in fields]  # Obtiene los nombres de los campos



                for shapeRecord in sf.shapeRecords():
                    geom = shapeRecord.shape.__geo_interface__
                    if geom['type'] == 'Polygon':
                        poly = Polygon(geom['coordinates'][0])
                        multi_poly = MultiPolygon(poly) 
                    elif geom['type'] == 'MultiPolygon':
                        multi_poly = MultiPolygon([Polygon(poly) for poly in geom['coordinates']])
                    
                    # Diccionario clave-valor con los datos del shapeRecord
                    metadata = {field: value for field, value in zip(field_names, shapeRecord.record)}


                    Ambiente.objects.create(
                        campo=campo,
                        #datos=shapeRecord.record, 
                        datos=metadata,
                        ambiente_geom=multi_poly  
                    )
        except Exception as e:
            raise Exception(f"Error processing shapefile: {str(e)}")





