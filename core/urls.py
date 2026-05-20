"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
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
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path, re_path

from imoveis.auth_views import login_view, logout_view, me_view, password_reset_confirm_view, refresh_view, register_view
from .views import frontend_app

urlpatterns = [
    path('imoveis/', include('imoveis.urls')),
    path('api/auth/login/', login_view, name='auth_login'),
    path('api/auth/register/', register_view, name='auth_register'),
    path('api/auth/me/', me_view, name='auth_me'),
    path('api/auth/logout/', logout_view, name='auth_logout'),
    path('api/auth/password-reset/confirm/', password_reset_confirm_view, name='auth_password_reset_confirm'),
    path('api/auth/refresh/', refresh_view, name='auth_refresh'),
    re_path(
        r'^(?P<_path>(admin(?:/.*)?|login/?|cadastro/?|favoritos/?|contato/?|resetar-senha/.*|imoveis(?:/[^/]+)?/?))$',
        frontend_app,
        name='frontend_app_route',
    ),
    path('', frontend_app, name='frontend_app'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
