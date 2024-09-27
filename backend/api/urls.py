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
from user import views as user_view
from empresa import views as empresa_view
from campo import views as campo_view
from ambientes.views import FileUploadView
from especie import views as especie_view

router = routers.DefaultRouter()
router.register(r'users', user_view.UserViewSet, basename="Usuarios")
router.register(r'empresas', empresa_view.EmpresaViewSet, basename="Empresas")
router.register(r'campos', campo_view.CampoViewSet, basename="Campos")
router.register(r'especies', especie_view.EspecieViewSet, basename="Especies")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include(router.urls)),
    path('upload-shapefile/', FileUploadView.as_view(), name='upload-shapefile'),

    #path('empresas/<int:empresa_id>/campos/', campo_view.campos_por_empresa, name='campos_por_empresa'),


]
