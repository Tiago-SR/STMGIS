from django.shortcuts import render
from rest_framework import viewsets
from .models import Especie
from .serializers import EspecieSerializer

class EspecieViewSet(viewsets.ModelViewSet):
    queryset = Especie.objects.all().order_by('nombre')
    serializer_class = EspecieSerializer
