from django import forms
from .models import Campo

class CampoForm(forms.ModelForm):
    class Meta:
        model = Campo
        fields = ['nombre', 'superficie', 'departamento', 'empresa']  # Campos que quieres incluir en el formulario
