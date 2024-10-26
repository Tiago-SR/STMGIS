"""
URL configuration for api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView
from cultivo.views import cultivodata_geojson_view, sse_notify
from .jwt_personalizado import CustomTokenObtainPairView
from user import views as user_view
from empresa import views as empresa_view
from campo import views as campo_view
from ambientes.views import FileUploadView, ambiente_geojson_view
from ambientes import views as ambientes_view
from campo.views import CampoViewSet
from especie import views as especie_view
from gestion import views as gestion_view
from cultivo import views as cultivo_view
from cultivo.views import CultivoViewSet
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
    path('', include(router.urls)),
    path('upload-shapefile/', FileUploadView.as_view(), name='upload-shapefile'),
    path('geojson/', ambiente_geojson_view, name='ambiente_geojson'),
    path('campos/activate/<uuid:pk>/', CampoViewSet.as_view({'post': 'activate'}), name='campo-activate'),
    path('cultivodata-geojson/', cultivodata_geojson_view, name='cultivodata-geojson'),
    path('sse-notify/<str:upload_id>/', sse_notify, name='sse_notify'),
    #path('api/cultivo/<int:cultivo_id>/rendimiento/', RendimientoAmbienteView.as_view(), name='cultivo-rendimiento')
    path('rendimientos/<uuid:pk>/calcular-rendimiento/', RendimientoAmbienteView.as_view({'get': 'calcular_rendimiento'}), name='cultivo-rendimiento')

]
