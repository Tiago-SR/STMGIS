from django.test import TestCase

# Create your tests here.
from django.test import TestCase
from .models import Empresa

class EmpresaModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Configura un objeto Empresa para usar en las pruebas
        Empresa.objects.create(nombre="Empresa Prueba", rut="12345678-9", direccion="Calle Falsa 123")

    def test_nombre_label(self):
        empresa = Empresa.objects.get(id=1)
        field_label = empresa._meta.get_field('nombre').verbose_name
        self.assertEquals(field_label, 'nombre')

    def test_rut_label(self):
        empresa = Empresa.objects.get(id=1)
        field_label = empresa._meta.get_field('rut').verbose_name
        self.assertEquals(field_label, 'rut')

    def test_direccion_label(self):
        empresa = Empresa.objects.get(id=1)
        field_label = empresa._meta.get_field('direccion').verbose_name
        self.assertEquals(field_label, 'direccion')
