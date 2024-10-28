# serializers.py

from rest_framework import serializers
from .models import RendimientoAmbiente

class RendimientoAmbienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RendimientoAmbiente
        fields = '__all__'