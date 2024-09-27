
# Create your models here.
from django.contrib.gis.db import models as geomodels
from django.db import models

class Ambiente(models.Model):  
    campo = models.ForeignKey('campo.Campo', related_name='ambientes', on_delete=models.CASCADE) 
    datos = models.JSONField(null=True, blank=True)  
    ambiente_geom = geomodels.MultiPolygonField(null=True, blank = True,srid=4326)  

    def __str__(self):        
        nombre_ambiente = self.datos.get('Name', 'Sin Nombre')  
        return f"Ambiente {self.name} en Campo {self.campo.nombre}"