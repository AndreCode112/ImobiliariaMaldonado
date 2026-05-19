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
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from imoveis.auth_views import login_view, me_view, password_reset_confirm_view, register_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('imoveis/', include('imoveis.urls')),
    path('api/auth/login/', login_view, name='auth_login'),
    path('api/auth/register/', register_view, name='auth_register'),
    path('api/auth/me/', me_view, name='auth_me'),
    path('api/auth/password-reset/confirm/', password_reset_confirm_view, name='auth_password_reset_confirm'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    