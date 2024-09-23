from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import Polygon



from empresa.models import Empresa
# Create your models here.
class Campo(models.Model):
    nombre = models.CharField(max_length=100)
    superficie = models.FloatField()   
    departamento = models.CharField(max_length=100)
    empresa = models.ForeignKey(Empresa, related_name='campos', on_delete=models.CASCADE)
    shapePoligon = gis_models.PolygonField(null=True, blank=True, srid=4326)  # Campo espacial
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre
    

  
