from api.pagination import StandardResultsSetPagination
from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from .serializers import EmpresaSerializer
from .models import Empresa

class EmpresaListView(generics.ListAPIView):
    queryset = Empresa.objects.all().order_by('nombre')
    serializer_class = EmpresaSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'responsable'):
            return user.responsable.empresas.filter(is_deleted=False)
        return Empresa.objects.filter(is_deleted=False)
    
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.filter(is_deleted=False)
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'responsable'):
            return user.responsable.empresas.filter(is_deleted=False)
        return Empresa.objects.filter(is_deleted=False)
