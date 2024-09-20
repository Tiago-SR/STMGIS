

from rest_framework import viewsets

from .serializers import EmpresaSerializer
from .models import Empresa


# Create your views here.
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.filter(is_deleted=False)
    serializer_class = EmpresaSerializer