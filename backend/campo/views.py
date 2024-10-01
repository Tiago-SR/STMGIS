# Create your views here.
from rest_framework import viewsets
from rest_framework.decorators import action
from campo.models import Campo
from user.models import User
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
from rest_framework.permissions import IsAuthenticated
from api.const import ADMIN, RESPONSABLE



class CampoViewSet(viewsets.ModelViewSet):
    queryset = Campo.objects.all()
    serializer_class = CampoSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Permite JSON y multipart
    permission_classes = [IsAuthenticated]
    def list(self, request): 
        user = request.user     
        
        if user.is_superuser or user.user_type == ADMIN:

            campos = Campo.objects.all()
        else :
            campos = Campo.objects.filter(is_active=True)
        empresa_id = request.query_params.get('empresa')  # Obtiene el parámetro de la consulta

        if empresa_id:
                    campos = campos.filter(empresa_id=empresa_id)

        if campos.exists():
            serializer = CampoSerializer(campos, many=True)
            return Response({'data': serializer.data, 'success': True}, status=status.HTTP_200_OK)
        else:
            return Response({'message': 'No hay campos disponibles.'}, status=status.HTTP_404_NOT_FOUND)



    """ 
       if empresa_id:
            print("Empresa ID recibido:", empresa_id)
            try:
                campos = Campo.objects.filter(empresa_id=empresa_id, is_active=True)
                if campos.exists():
                    serializer = CampoSerializer(campos, many=True)                    
                    return Response({'data': serializer.data, 'success': True}), status.HTTP_200_OK
                else:
                    return Response({'message': 'No hay campos para esta empresa.'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            campos = Campo.objects.filter(is_active=True)
            serializer = CampoSerializer(campos, many=True)
            return Response({'data': serializer.data, 'success': True}, status=status.HTTP_200_OK)
    """
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
                        transaction.set_rollback(True)
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
              

                    Ambiente.objects.create(
                        campo=campo,
                        name  = shapeRecord.record['Name'],                        
                        area = shapeRecord.record['Area'],
                        ia = shapeRecord.record['IA'],
                        lote = shapeRecord.record['Lote'],
                        sist_prod = shapeRecord.record['Sist Prod'],
                        zona = shapeRecord.record['Zona'],
                        tipo_suelo = shapeRecord.record['Tipo Suelo'],
                        posicion = shapeRecord.record['Posición'],
                        prof = shapeRecord.record['Prof'],
                        restriccion =   shapeRecord.record['Restriccio'],
                        ambiente = shapeRecord.record['AMBIENTE'],
                        idA = shapeRecord.record['ID'], 
                        is_active = True,                
                        ambiente_geom=multi_poly  
                    )
                   
        except Exception as e:
            raise Exception(f"Error processing shapefile: {str(e)}")


    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        try:
            campo = self.get_object() 
            if not campo.is_active:
                campo.is_active = True
                campo.save()
                campo.ambientes.update(is_active=True)
                return Response({'message': 'Campo activado correctamente'}, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'El campo ya está activado'}, status=status.HTTP_400_BAD_REQUEST)
        except Campo.DoesNotExist:
            return Response({'error': 'Campo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        try:
            campo = self.get_object() 
            if campo.is_active:
                campo.is_active = False
                campo.save()

                campo.ambientes.update(is_active=False)

                return Response({'message': 'Campo y sus ambientes desactivados correctamente'}, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'El campo ya está desactivado'}, status=status.HTTP_400_BAD_REQUEST)
        except Campo.DoesNotExist:
            return Response({'error': 'Campo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

