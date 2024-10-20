from django.contrib.gis.db import models
from django.conf import settings
from django.contrib.gis.geos import Point
import uuid

class Cultivo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    campo = models.ForeignKey('campo.Campo', on_delete=models.CASCADE)
    gestion = models.ForeignKey('gestion.Gestion', on_delete=models.CASCADE)
    especie = models.ForeignKey('especie.Especie', on_delete=models.CASCADE)
    sup_total = models.FloatField()
    rinde_prom = models.FloatField()

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class CultivoData(models.Model):
    cultivo = models.ForeignKey(Cultivo, on_delete=models.CASCADE, related_name='data')
    nombre_archivo_csv = models.CharField(max_length=255)
    punto_geografico = models.PointField()
    anch_fja = models.FloatField(null=True, blank=True)
    humedad = models.FloatField(null=True, blank=True)
    masa_rend_seco = models.FloatField(null=True, blank=True)
    velocidad = models.FloatField(null=True, blank=True)
    fecha = models.DateField()
    rendimiento_real = models.FloatField(null=True, blank=True)
    rendimiento_normalizado = models.FloatField(null=True, blank=True)
    rendimiento_relativo = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Cultivo Data'
        verbose_name_plural = 'Cultivo Data'

    def __str__(self):
        return f'Data from {self.nombre_archivo_csv} for {self.cultivo.nombre}'