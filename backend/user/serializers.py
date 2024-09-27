from rest_framework import serializers
from .models import User, Responsable, Admin
from empresa.serializers import EmpresaSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email')

class ResponsableSerializer(serializers.ModelSerializer):
    empresas = EmpresaSerializer(many=True, read_only=True)
    class Meta:
        model = Responsable
        fields = ('id', 'first_name', 'last_name', 'email', 'is_active', 'descripcion', 'empresas', )

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ('id', 'first_name', 'last_name', 'email', 'nacionalidad')