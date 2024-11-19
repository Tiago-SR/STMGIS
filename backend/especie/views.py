from rest_framework import viewsets
from .models import Especie
from .serializers import EspecieSerializer

class EspecieViewSet(viewsets.ModelViewSet):
    serializer_class = EspecieSerializer

    def get_queryset(self):
        return Especie.objects.filter(is_deleted=False).order_by('nombre')