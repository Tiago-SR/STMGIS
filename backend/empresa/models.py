from django.db import models

# Create your models here.
class Empresa(models.Model):
    nombre = models.CharField(max_length=255)
    rut = models.CharField(max_length=12)
    direccion = models.CharField(max_length=255)

    def __str__(self):
        return self.nombre
        # haciendo cambio prueba
    