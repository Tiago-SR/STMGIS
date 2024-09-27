from django.test import TestCase

# Create your tests here.
from campo.models import Campo

class CampoTestCase(TestCase):
    def setUp(self):
        Campo.objects.create(nombre="Campo1", superficie=1000, departamento="Canelones", shapePoligon="POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))")
        Campo.objects.create(nombre="Campo2", superficie=2000, departamento="Montevideo", shapePoligon="POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))")

    def test_campo(self):
        campo1 = Campo.objects.get(nombre="Campo1")
        campo2 = Campo.objects.get(nombre="Campo2")
        self.assertEqual(campo1.superficie, 1000)
        self.assertEqual(campo2.superficie, 2000)
        self.assertEqual(campo1.departamento, "Canelones")
        self.assertEqual(campo2.departamento, "Montevideo")
        self.assertEqual(campo1.shapePoligon, "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))")
        self.assertEqual(campo2.shapePoligon, "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))")
        self.assertEqual(campo1.is_active, True)
        self.assertEqual(campo2.is_active, True)

        