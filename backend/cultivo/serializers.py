from rest_framework import serializers
from .models import Cultivo

class CultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cultivo
        fields = '__all__'
