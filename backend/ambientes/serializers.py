

from rest_framework import serializers
from .models import Ambiente
from campo.serializers import CampoSerializer  # Asumiendo que quieres incluir detalles sobre el campo


class AmbienteSerializer(serializers.ModelSerializer):
    campo = CampoSerializer(read_only=True)  
    class Meta:
        model = Ambiente
        fields = '__all__'
