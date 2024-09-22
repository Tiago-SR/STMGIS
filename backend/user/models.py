from django.contrib.auth.models import AbstractUser
from django.db import models
from api.const import USER_TYPE_CHOICES, RESPONSABLE
import uuid

# Create your models here.
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_type = models.CharField(choices=USER_TYPE_CHOICES, default=RESPONSABLE)

class Admin(User):
    nacionalidad = models.CharField(max_length=40)
    class Meta:
        verbose_name = 'Administrador'
        verbose_name_plural = 'Administradores'

class Responsable(User):
    descripcion = models.TextField()
    empresas = models.ManyToManyField('empresa.Empresa', blank=True)
    class Meta:
        verbose_name = 'Responsable'
        verbose_name_plural = 'Responsables'