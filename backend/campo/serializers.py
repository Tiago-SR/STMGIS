from rest_framework import serializers
from .models import Campo

class CampoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campo
        fields = '__all__'

class CamposListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campo
        fields = ( 'id', 'nombre', 'superficie', 'departamento', 'shapePoligon', 'empresa', 'is_active')