from django.shortcuts import render
from rest_framework import viewsets
from gestion.models import Gestion
from gestion.serializers import GestionSerializer

# Create your views here.

class GestionViewSet(viewsets.ModelViewSet):
    queryset = Gestion.objects.all()
    serializer_class = GestionSerializer