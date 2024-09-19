

from rest_framework import viewsets

from .serializers import UserSerializer
from .models import Empresa


# Create your views here.
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = UserSerializer