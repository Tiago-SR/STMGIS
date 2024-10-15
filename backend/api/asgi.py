import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')

django.setup()  # Initialize Django

from cultivo.consumers import RendimientoConsumer

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ws/rendimiento/<str:cultivo_id>/', RendimientoConsumer.as_asgi()),
        ])
    ),
})
