# Create your views here.
from rest_framework import viewsets
from campo.models import Campo
from campo.serializers import CampoSerializer
from rest_framework.response import Response
from rest_framework import status

class CampoViewSet(viewsets.ModelViewSet):
    queryset = Campo.objects.all()
    serializer_class = CampoSerializer
    def list (self, request):        
        empresa_id = request.query_params.get('empresa')  # Obtiene el parámetro de la consulta
        if empresa_id:
            print("Empresa ID recibido:", empresa_id)
            try:
                campos = Campo.objects.filter(empresa_id=empresa_id)
                if campos.exists():
                    serializer = CampoSerializer(campos, many=True)                    
                    return Response({'data': serializer.data, 'success': True})
                else:
                    return Response({'message': 'No hay campos para esta empresa.'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pass
   



