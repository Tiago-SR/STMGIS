from django.contrib.gis.db import models
from django.conf import settings
from django.contrib.gis.geos import Point
import uuid

class Cultivo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, blank=True)
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
    def save(self, *args, **kwargs):
        # Concatenamos los valores de los campos relacionados para crear el nombre
        campo_nombre = self.campo.nombre  # Asumiendo que Campo tiene un campo 'nombre'
        especie_nombre = self.especie.nombre  # Asumiendo que Especie tiene un campo 'nombre'
        gestion_nombre = self.gestion.name  # Asumiendo que Gestión tiene un campo 'nombre'

        # Asignamos el nuevo valor a 'nombre' en el formato que quieres
        self.nombre = f"{campo_nombre} {especie_nombre} {gestion_nombre} detalle"
        
        # Llamamos al método original para guardar el objeto
        super(Cultivo, self).save(*args, **kwargs)

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