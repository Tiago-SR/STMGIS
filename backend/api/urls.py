from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import  settings
from django.conf.urls.static import  static
from empresa.views import EmpresaListView
from user.views import UserListView
from .jwt_personalizado import CustomTokenObtainPairView
from cultivo.views import cultivodata_geojson_view, sse_notify, CultivoListView
from user import views as user_view
from empresa import views as empresa_view
from campo import views as campo_view
from ambientes.views import FileUploadView, ambiente_geojson_view, ambiente_geojson_por_cultivo_view
from campo.views import CampoViewSet, CampoListView
from especie import views as especie_view
from gestion import views as gestion_view
from cultivo import views as cultivo_view
from rendimiento_ambiente.views import RendimientoAmbienteView


router = routers.DefaultRouter()
router.register(r'users', user_view.UserViewSet, basename="Usuarios")
router.register(r'empresas', empresa_view.EmpresaViewSet, basename="Empresas")
router.register(r'register', user_view.RegisterViewSet, basename="Register")
router.register(r'campos', campo_view.CampoViewSet, basename="Campos")
router.register(r'especies', especie_view.EspecieViewSet, basename="Especies")
router.register(r'gestiones', gestion_view.GestionViewSet, basename="Gestiones")
router.register(r'cultivos', cultivo_view.CultivoViewSet, basename="Cultivos")
router.register(r'rendimientos', RendimientoAmbienteView, basename="Rendimientos")


urlpatterns = [
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/', admin.site.urls),
    path('upload-shapefile/', FileUploadView.as_view(), name='upload-shapefile'),
    path('geojson/', ambiente_geojson_view, name='ambiente_geojson'),
    path('geojson-por-cultivo/', ambiente_geojson_por_cultivo_view, name='ambiente_geojson_por_cultivo'),
    path('campos/activate/<uuid:pk>/', CampoViewSet.as_view({'post': 'activate'}), name='campo-activate'),
    path('cultivodata-geojson/', cultivodata_geojson_view, name='cultivodata-geojson'),
    path('sse-notify/<str:upload_id>/', sse_notify, name='sse_notify'),
    path('rendimientos/<uuid:pk>/calcular-rendimiento/', RendimientoAmbienteView.as_view({'get': 'calcular_rendimiento'}), name='cultivo-rendimiento'),
    path('rendimientos/<uuid:pk>/exportar-excel/', RendimientoAmbienteView.as_view({'get': 'exportar_excel'}), name='exportar-excel'),
    path('sse-notify/<str:upload_id>/', sse_notify, name='sse_notify'),
    path('cultivos/list/', CultivoListView.as_view(), name='cultivo-list'),
    path('empresas/list/', EmpresaListView.as_view(), name='empresa-list'),
    path('campos/list/', CampoListView.as_view(), name='campo-list'),
    path('usuarios/list/', UserListView.as_view(), name='user-list'),
    path('', include(router.urls)),
] +  static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
