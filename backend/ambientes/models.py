
# Create your models here.
from django.contrib.gis.db import models as geomodels
from django.db import models


class Ambiente(models.Model):     
 
    campo = models.ForeignKey('campo.Campo', related_name='ambientes', on_delete=models.CASCADE) 
    #datos = models.JSONField(null=True, blank=True)  
    ambiente_geom = geomodels.MultiPolygonField(null=True, blank = True,srid=4326) 
    name = models.CharField(max_length=100, null=True, blank=True)
    area = models.FloatField(null=True, blank=True)
    ia = models.IntegerField(null=True, blank=True)
    lote = models.CharField(max_length=100, null=True, blank=True)
    sist_prod = models.CharField(max_length=100, null=True, blank=True)
    zona = models.CharField(max_length=100, null=True, blank=True)
    tipo_suelo = models.IntegerField(null=True, blank=True)
    posicion = models.CharField(max_length=100, null=True, blank=True)
    prof = models.CharField(max_length=100, null=True, blank=True)
    restriccion = models.CharField(max_length=100, null=True, blank=True)
    ambiente = models.CharField(max_length=100, null=True, blank=True)
    idA = models.IntegerField( null=True, blank=True)
    is_active = models.BooleanField(default=True)
     

    def __str__(self):        
        nombre_ambiente = self.datos.get('Name', 'Sin Nombre')  
        return f"Ambiente {self.name} en Campo {self.campo.nombre}"