from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS

from .Controller.api_buscar_cep import ApiBuscarCep
from .Controller.api_buscar_endereco import NominatimSearch
from .Controller.api_buscar_pontos_interesse import ApiBuscarPontosInteresse
from .Controller.api_cadastro_imoveis import (
    ApiCepCadastro,
    ApiCidadeDetail,
    ApiCidades,
    ApiCorretorDetail,
    ApiCorretores,
    ApiImovelDetail,
    ApiImoveis,
    ApiStats,
)
from .models import FavoritoImovel, Imovel, PontoInteresse


def _json_response(controller):
    return JsonResponse(controller.response, status=controller.status)


class IsSuperUserOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@api_view(["GET"])
@permission_classes([IsSuperUser])
def GetCidadeInfoCep(request):
    instanceApiBuscarCep = ApiBuscarCep()
    instanceApiBuscarCep.execute(request)
    return _json_response(instanceApiBuscarCep)


@api_view(["GET"])
@permission_classes([IsSuperUser])
def ApiStatsView(request):
    controller = ApiStats()
    controller.execute(request)
    return _json_response(controller)


@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiImoveisView(request):
    controller = ApiImoveis()
    controller.execute(request)
    return _json_response(controller)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiImovelDetailView(request, pk):
    controller = ApiImovelDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCepCadastroView(request, cep):
    controller = ApiCepCadastro()
    controller.execute(request, cep)
    return _json_response(controller)


@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiBuscarPontosInteresseView(request):
    cidade_id = request.GET.get("cidade_id")
    if cidade_id:
        controller = ApiBuscarPontosInteresse()
        pontos = PontoInteresse.objects.filter(cidade_id=cidade_id)
        controller.success(
            {
                "success": True,
                "provider": "database",
                "data": {"results": [ponto.to_map_dict() for ponto in pontos]},
            }
        )
        return _json_response(controller)

    latitude = request.GET.get("latitude")
    longitude = request.GET.get("longitude")
    if not latitude or not longitude:
        controller = ApiBuscarPontosInteresse()
        controller.error(
            "Informe latitude e longitude.",
            400,
            {"success": False, "message": "Informe latitude e longitude."},
        )
        return _json_response(controller)

    controller = ApiBuscarPontosInteresse()
    controller.execute(
        latitude,
        longitude,
        radius=request.GET.get("radius", 5000),
        limit=request.GET.get("limit", 500),
    )
    return _json_response(controller)


@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiBuscarEnderecoView(request):
    controller = NominatimSearch()
    controller.search(request)
    return _json_response(controller)


@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCorretoresView(request):
    controller = ApiCorretores()
    controller.execute(request)
    return _json_response(controller)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCorretorDetailView(request, pk):
    controller = ApiCorretorDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCidadesView(request):
    controller = ApiCidades()
    controller.execute(request)
    return _json_response(controller)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCidadeDetailView(request, pk):
    controller = ApiCidadeDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ApiFavoritosView(request):
    favoritos = FavoritoImovel.objects.filter(usuario=request.user).values_list("imovel_id", flat=True)
    return JsonResponse({"results": list(favoritos)})


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def ApiFavoritoDetailView(request, imovel_id):
    try:
        imovel = Imovel.objects.get(pk=imovel_id)
    except Imovel.DoesNotExist:
        return JsonResponse({"message": "Imóvel não encontrado."}, status=404)

    if request.method == "POST":
        FavoritoImovel.objects.get_or_create(usuario=request.user, imovel=imovel)
        return JsonResponse({"imovel_id": imovel_id, "favorited": True})

    FavoritoImovel.objects.filter(usuario=request.user, imovel=imovel).delete()
    return JsonResponse({"imovel_id": imovel_id, "favorited": False})
