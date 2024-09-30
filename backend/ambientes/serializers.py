from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Ambiente
from campo.serializers import CampoSerializer

class AmbienteSerializer(GeoFeatureModelSerializer):
    campo = CampoSerializer(read_only=True)

    class Meta:
        model = Ambiente
        geo_field = "ambiente_geom"
        fields = ('id', 'name', 'area', 'ia', 'lote', 'sist_prod', 'zona', 'tipo_suelo',
                  'posicion', 'prof', 'restriccion', 'ambiente', 'idA', 'is_active', 'campo')
