from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Admin, Responsable
from .forms import AdminForm, ResponsableForm

# Register your models here.
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    search_fields = ('username', 'email')
    ordering = ('username',)

@admin.register(Admin)
class CustomAdminAdmin(admin.ModelAdmin):
    form = AdminForm
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'user_type')
    search_fields = ('username', 'email')
    ordering = ('username',)

@admin.register(Responsable)
class CustomResponsableAdmin(admin.ModelAdmin):
    form = ResponsableForm
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'user_type')
    search_fields = ('username', 'email')
    ordering = ('username',)

