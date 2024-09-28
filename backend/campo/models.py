from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import Polygon
import uuid


from empresa.models import Empresa
# Create your models here.
class Campo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    superficie = models.FloatField()   
    departamento = models.CharField(max_length=100)
    empresa = models.ForeignKey(Empresa, related_name='campos', on_delete=models.CASCADE)
    shapePoligon = gis_models.PolygonField(null=True, blank=True, srid=4326)  # Campo espacial
    is_active = models.BooleanField(default=True)

    def delete(self, *args, **kwargs):
        self.is_active = False  # Marcar el campo como inactivo en lugar de eliminarlo
        self.save()
        # Aplicar el soft delete a los objetos Ambiente relacionados
        self.ambientes.all().update(is_active=False)

    def __str__(self):
        return self.nombre
    

  
