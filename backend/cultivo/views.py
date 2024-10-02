from rest_framework import viewsets
from .models import Cultivo
from .serializers import CultivoSerializer

# Create your views here.

class CultivoViewSet(viewsets.ModelViewSet):
    queryset = Cultivo.objects.all().order_by('nombre')
    serializer_class = CultivoSerializer
