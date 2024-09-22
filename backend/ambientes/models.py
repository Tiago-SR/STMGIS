
# Create your models here.
from django.contrib.gis.db import models as geomodels
from django.db import models

class Ambiente(models.Model):
    name = models.IntegerField()  # Asumiendo que es un identificador numérico
    ia = models.IntegerField()
    area = models.FloatField()
    empresa = models.CharField(max_length=100)
    campo = models.CharField(max_length=100)
    zona = models.CharField(max_length=100)
    posicion = models.CharField(max_length=100)
    profundidad = models.CharField(max_length=100, null=True, blank=True)
    restriccion = models.CharField(max_length=100, null=True, blank=True)
    has_siembra = models.IntegerField()
    sist_prod = models.CharField(max_length=100)
    tipo_suelo = models.CharField(max_length=100)
    ambiente_geom = geomodels.PolygonField(null=True, blank = True,srid=4326)  # Espacio para la geometría
