from django.test import SimpleTestCase
from django.urls import resolve

from .views import frontend_app


class FrontendRoutingTests(SimpleTestCase):
    def test_admin_routes_are_served_by_frontend_app(self):
        self.assertIs(resolve("/admin/imoveis").func, frontend_app)
        self.assertIs(resolve("/admin/corretores").func, frontend_app)

    def test_api_routes_are_not_served_by_frontend_app(self):
        self.assertIsNot(resolve("/imoveis/api/imoveis/").func, frontend_app)
        self.assertIsNot(resolve("/api/auth/login/").func, frontend_app)
