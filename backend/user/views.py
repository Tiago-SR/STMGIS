from rest_framework import viewsets
from django.core.mail import EmailMessage
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.conf import settings
from .serializers import UserSerializer, UserListSerializer, ResponsableSerializer, AdminSerializer
from .models import User, Responsable, Admin
from api.const import ADMIN, RESPONSABLE


# Create your views here.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    def list(self, request):
        user = request.user
        queryset = User.objects.filter(is_staff=False, is_superuser=False)
        if user.is_authenticated and user.user_type == ADMIN:
            queryset = queryset.filter(user_type=RESPONSABLE)
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data, status=200)
    
    def retrieve(self, request, pk=None):
        user = User.objects.filter(pk=pk, is_staff=False, is_superuser=False)
        if not user.exists():
            return Response('Usuario no encontrado', status=404)
        user = user.first()
        if user.user_type == ADMIN:
            serializer = UserListSerializer(user)
        elif user.user_type == RESPONSABLE:
            responsable = Responsable.objects.filter(id=user.id).first()
            if not responsable:
                return Response('Responsable no encontrado', status=404)
            serializer = ResponsableSerializer(responsable)
        else:
            return Response('Tipo de usuario no válido', status=400)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        user = User.objects.filter(pk=kwargs['pk'], is_staff=False, is_superuser=False)
        if not user.exists():
            return Response('Usuario no encontrado', status=404)
        user = user.first()
        if user.user_type == RESPONSABLE:
            self.queryset = Responsable.objects.all()
            self.serializer_class = ResponsableSerializer
            empresas_ids = request.data.get('empresas')
            if not empresas_ids is None:
                responsable = Responsable.objects.filter(id=user.id).first()
                responsable.empresas.clear()
                responsable.empresas.add(*empresas_ids)
            
        return super().partial_update(request, *args, **kwargs)

    @action(methods=['post'], detail=False)
    def invite(self, request):
        email = request.data.get('email', None)
        if not email:
            return Response('El email es requerido', status=400)
        user = User.objects.filter(email=email).first()
        if user and user.is_active:
            return Response('El email ya está registrado', status=400)
        if user and not user.is_active:
            user.delete()
        invited_user = Responsable.objects.create_user(username=email, email=email, password=None, is_active=False)
        token, _ = Token.objects.get_or_create(user=invited_user)
        
        invite_url = settings.FRONTEND_URL + '/register?token=' + token.key
        email = EmailMessage(
            'Invitación para registrarse en el sistema',
            f'Por favor, regístrate usando el siguiente enlace: {invite_url}',
            settings.EMAIL_HOST_USER,
            [email]
        )
        email.fail_silently = False
        email.send()
        return Response({'message': 'Invitación enviada correctamente'}, status=200)

    @action(methods=['post'], detail=False)
    def forgotpassword(self, request):
        email = request.data.get('email', None)
        if not email:
            return Response('El email es requerido', status=400)
        user = User.objects.filter(email=email).first()
        if not user:
            return Response('El email no está registrado', status=400)
        token, _ = Token.objects.get_or_create(user=user)
        reset_url = settings.FRONTEND_URL + '/reset-password?token=' + token.key
        email = EmailMessage(
            'Recuperación de contraseña',
            f'Por favor, restablece tu contraseña usando el siguiente enlace: {reset_url}',
            settings.EMAIL_HOST_USER,
            [email]
        )
        email.fail_silently = False
        email.send()
        return Response('Email enviado correctamente', status=200)

class RegisterViewSet(viewsets.ViewSet):
    def create(self, request):
        token = request.data.get('token', None)
        try:
            token = Token.objects.get(key=token)
        except Token.DoesNotExist:
            return Response('Token inválido o expirado', status=400)

        user = token.user

        first_name = request.data.get('firstName', None)
        last_name = request.data.get('lastName', None)
        if not first_name or not last_name:
            return Response('El nombre y apellido son requeridos', status=400)
        password = request.data.get('password', None)
        if not password:
            return Response('La contraseña es requerida', status=400)
        username = request.data.get('username', None)
        if not username:
            return Response('El nombre de usuario es requerido', status=400)
        user_exists = User.objects.filter(username=username)
        if user_exists:
            return Response('El nombre de usuario ya está en uso', status=400)

        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.set_password(password)
        user.save()

        # Opcionalmente eliminar el token después de que el usuario se haya registrado
        token.delete()

        return Response({'message': 'Registro completado correctamente', 'pass': password}, status=200)

    @action(methods=['post'], detail=False)
    def recovery_password(self, request):
        token = request.data.get('token', None)
        try:
            token = Token.objects.get(key=token)
        except Token.DoesNotExist:
            return Response('Token inválido o expirado', status=400)

        user = token.user

        password = request.data.get('password', None)
        if not password:
            return Response('La contraseña es requerida', status=400)

        user.set_password(password)
        user.save()

        # Opcionalmente eliminar el token después de que el usuario se haya registrado
        token.delete()

        return Response('Contraseña recuperada correctamente', status=200)

    @action(methods=['get'], detail=False)
    def check_register_token(self, request):
        token = request.query_params.get('token', None)
        if not token:
            return Response('El token es requerido', status=400)
        try:
            Token.objects.get(key=token)
        except Token.DoesNotExist:
            return Response('Token inválido o expirado', status=400)
        return Response('Token válido', status=200)