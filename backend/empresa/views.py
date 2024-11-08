from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .serializers import EmpresaSerializer
from .models import Empresa
from user.models import Responsable

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.filter(is_deleted=False)
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'responsable'):
            return user.responsable.empresas.filter(is_deleted=False)
        return Empresa.objects.filter(is_deleted=False)
