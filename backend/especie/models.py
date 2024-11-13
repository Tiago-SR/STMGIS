from django.contrib.gis.db import models
import uuid

class Nutriente(models.TextChoices):
    NITROGENO = "Nitrógeno", "Nitrógeno"
    FOSFORO = "Fósforo", "Fósforo"
    POTASIO = "Potasio", "Potasio"

class Especie(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    humedad_minima = models.FloatField()
    humedad_maxima = models.FloatField()
    variacion_admitida = models.FloatField()
    descripcion = models.TextField(blank=True, null=True)
    nutrientes = models.JSONField()
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['nombre']

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.save()

    def __str__(self):
        return self.nombre
