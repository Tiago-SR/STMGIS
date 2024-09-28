from django import forms
from django.contrib.auth.hashers import make_password
from .models import Admin, Responsable
from api.const import ADMIN, RESPONSABLE

class AdminForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(), label='Contraseña')
    confirm_password = forms.CharField(widget=forms.PasswordInput(), label='Confirmar Contraseña')

    class Meta:
        model = Admin
        fields = (
            'username', 'password', 'confirm_password', 'email', 
            'first_name', 'last_name', 'nacionalidad', 
            'is_active', 'user_permissions', 'groups', 'date_joined'
        )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Las contraseñas no coinciden.")

    def save(self, commit=True):
        admin = super().save(commit=False)
        admin.password = make_password(self.cleaned_data['password'])
        if commit:
            admin.save()
        admin.user_type = ADMIN
        return admin
class ResponsableForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(), label='Contraseña')
    confirm_password = forms.CharField(widget=forms.PasswordInput(), label='Confirmar Contraseña')

    class Meta:
        model = Responsable
        fields = (
            'username', 'password', 'confirm_password', 'empresas', 'email', 
            'first_name', 'last_name', 'descripcion', 
            'is_active', 'user_permissions', 'groups', 'date_joined'
        )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Las contraseñas no coinciden.")

    def save(self, commit=True):
        responsable = super().save(commit=False)
        responsable.password = make_password(self.cleaned_data['password'])
        if commit:
            responsable.save()
        responsable.user_type = RESPONSABLE
        return responsable
