from django.urls import path

from .views import (
    ApiBuscarEnderecoView,
    ApiCepCadastroView,
    ApiBuscarPontosInteresseView,
    ApiCidadeDetailView,
    ApiCidadesView,
    ApiCorretorDetailView,
    ApiCorretoresView,
    ApiFavoritoDetailView,
    ApiFavoritosView,
    ApiImovelDetailView,
    ApiImoveisView,
    ApiStatsView,
    GetCidadeInfoCep,
)

urlpatterns = [
    path("api/get/cidade/cep/", GetCidadeInfoCep, name="GetCidadeCep"),
    path("api/stats/", ApiStatsView, name="ApiStats"),
    path("api/imoveis/", ApiImoveisView, name="ApiImoveis"),
    path("api/imoveis/<int:pk>/", ApiImovelDetailView, name="ApiImovelDetail"),
    path("api/favoritos/", ApiFavoritosView, name="ApiFavoritos"),
    path("api/favoritos/<int:imovel_id>/", ApiFavoritoDetailView, name="ApiFavoritoDetail"),
    path("api/cep/<str:cep>/", ApiCepCadastroView, name="ApiCepCadastro"),
    path("api/buscar-endereco/", ApiBuscarEnderecoView, name="ApiBuscarEndereco"),
    path("api/pontos-interesse/", ApiBuscarPontosInteresseView, name="ApiBuscarPontosInteresse"),
    path("api/corretores/", ApiCorretoresView, name="ApiCorretores"),
    path("api/corretores/<int:pk>/", ApiCorretorDetailView, name="ApiCorretorDetail"),
    path("api/cidades/", ApiCidadesView, name="ApiCidades"),
    path("api/cidades/<int:pk>/", ApiCidadeDetailView, name="ApiCidadeDetail"),
]
