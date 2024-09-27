from django.db import models
from user.models import Admin
import uuid

# Create your models here.
class Empresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=255)
    rut = models.CharField(max_length=12)
    direccion = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False)  # Campo para soft delete


    def __str__(self):
        return self.nombre
        # haciendo cambio prueba
    