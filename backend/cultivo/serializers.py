from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Cultivo, CultivoData


class CultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cultivo
        fields = '__all__'

class CultivoDataGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = CultivoData
        geo_field = 'punto_geografico'
        fields = (
            'id', 'nombre_archivo_csv', 'anch_fja', 'humedad', 'masa_rend_seco',
            'velocidad', 'prod', 'fecha', 'cultivo_id', 'rendimiento_normalizado', 'rendimiento_relativo', 'rendimiento_real'
        )