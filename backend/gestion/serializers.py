from rest_framework import serializers
from .models import Gestion

class GestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gestion
        fields = '__all__'