from django.contrib.gis.db import models
import uuid

# Create your models here.
class Cultivo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    campo = models.ForeignKey('campo.Campo', on_delete=models.CASCADE)
    gestion = models.ForeignKey('gestion.Gestion', on_delete=models.CASCADE)
    especie = models.ForeignKey('especie.Especie', on_delete=models.CASCADE)
    sub_total = models.FloatField()
    rinde_prom = models.FloatField()
    # mapa_rendimiento = models.PointField()
    # rinde_por_ambiente --> si

    class Meta:
        ordering = ['nombre']