# models.py
from django.db import models
from django.contrib.gis.db import models as geomodels
from ambientes.models import Ambiente  

class RendimientoAmbiente(models.Model):
    cultivo = models.ForeignKey('cultivo.Cultivo', on_delete=models.CASCADE, related_name='rendimientos_ambiente')
    ambiente = models.ForeignKey(Ambiente, on_delete=models.CASCADE, related_name='rendimientos', null=True, blank=True)
    fecha_calculo = models.DateField(auto_now_add=True)
    rendimiento_real_promedio = models.FloatField(null=True, blank=True)
    rendimiento_relativo_promedio = models.FloatField(null=True, blank=True)
    coef_variacion_real = models.FloatField(null=True, blank=True)
    coef_variacion_relativo = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ['cultivo', 'ambiente']

    def __str__(self):
        return f"Rendimiento de ambiente {self.ambiente.name} para {self.cultivo.nombre} - Fecha: {self.fecha_calculo}"