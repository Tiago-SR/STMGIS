from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.
class User(AbstractUser):
    empresas = models.ManyToManyField('empresa.Empresa', related_name='users')