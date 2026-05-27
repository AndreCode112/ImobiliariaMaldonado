import json
import os
import subprocess
import time
import traceback
from json import JSONDecodeError
from urllib import error, parse, request as urlrequest

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count
from django.http import JsonResponse
from django.utils.encoding import force_bytes
from django.utils.dateparse import parse_time
from django.utils.http import urlsafe_base64_encode
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
from .Controller.lembrete_favoritos_scheduler import sync_crontab
from .models import Corretor, FavoritoImovel, Imovel, LembreteFavoritosConfig, PontoInteresse, log
from .Controller.logs import ApiLogs, InsertLogs
from .rate_limits import (
    admin_api_rate_limit,
    admin_write_rate_limit,
    public_api_rate_limit,
    search_api_rate_limit,
    user_api_rate_limit,
)


SERVER_LOG_SOURCES = {
    "nginx_error": {
        "label": "Nginx error",
        "command": ["tail", "-n", "{lines}", "/var/log/nginx/error.log"],
    },
    "cron": {
        "label": "Cron",
        "command": ["journalctl", "-u", "cron", "-n", "{lines}", "--no-pager", "-o", "short-iso"],
    },
    "lembrete_favoritos": {
        "label": "Lembrete favoritos",
        "command": ["tail", "-n", "{lines}", str(settings.BASE_DIR / "logs" / "lembrete_favoritos.log")],
    },
    "journal": {
        "label": "Journal",
        "command": ["journalctl", "-xe", "-n", "{lines}", "--no-pager", "-o", "short-iso"],
    },
    "app_service": {
        "label": "Serviço Django",
        "command": ["journalctl", "-u", "imobiliaria-maldonado.service", "-n", "{lines}", "--no-pager", "-o", "short-iso"],
    },
}


def _json_response(controller):
    if controller.status != 200:
        try:
            log_controller = InsertLogs()
            log_controller.execute(route=str(controller.__class__.__name__), message=controller.response)
        except Exception:
            pass
    
    return JsonResponse(controller.response, status=controller.status)


def _request_int(value, fallback, minimum=1, maximum=500):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(parsed, maximum))


def _superuser_unauthorized_response(request):
    if request.user and request.user.is_authenticated and request.user.is_superuser:
        return None
    return JsonResponse({"message": "Acesso restrito ao superadmin."}, status=401)


class IsSuperUserOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@admin_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUser])
def GetCidadeInfoCep(request):
    instanceApiBuscarCep = ApiBuscarCep()
    instanceApiBuscarCep.execute(request)
    return _json_response(instanceApiBuscarCep)


@admin_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUser])
def ApiStatsView(request):
    controller = ApiStats()
    controller.execute(request)
    return _json_response(controller)


@admin_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUser])
def ApiServerLogsView(request):
    source = request.GET.get("source") or "nginx_error"
    lines = _request_int(request.GET.get("lines"), 180, maximum=500)
    config = SERVER_LOG_SOURCES.get(source)
    if not config:
        return JsonResponse({"message": "Fonte de log inválida."}, status=400)

    command = [part.format(lines=str(lines)) for part in config["command"]]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=4, check=False)
    except FileNotFoundError:
        return JsonResponse(
            {
                "source": source,
                "label": config["label"],
                "lines": lines,
                "ok": False,
                "output": f"Comando não encontrado: {command[0]}",
            }
        )
    except subprocess.TimeoutExpired:
        return JsonResponse(
            {
                "source": source,
                "label": config["label"],
                "lines": lines,
                "ok": False,
                "output": "Tempo limite ao consultar o log.",
            }
        )

    output = result.stdout.strip() or result.stderr.strip() or "Sem registros para exibir."
    return JsonResponse(
        {
            "source": source,
            "label": config["label"],
            "lines": lines,
            "ok": result.returncode == 0,
            "output": output,
        }
    )


@admin_write_rate_limit
@admin_api_rate_limit
@api_view(["GET", "DELETE"])
def ApiLogsView(request):
    unauthorized = _superuser_unauthorized_response(request)
    if unauthorized:
        return unauthorized

    controller = ApiLogs()
    controller.execute(request)
    return _json_response(controller)


@admin_write_rate_limit
@public_api_rate_limit
@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiImoveisView(request):
    controller = ApiImoveis()
    controller.execute(request)
    return _json_response(controller)


@admin_write_rate_limit
@admin_api_rate_limit
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUser])
def ApiImovelDetailView(request, pk):
    controller = ApiImovelDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@public_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiImovelUuidDetailView(request, uuid):
    controller = ApiImovelDetail()
    controller.execute(request, public_uuid=uuid)
    return _json_response(controller)


@search_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCepCadastroView(request, cep):
    controller = ApiCepCadastro()
    controller.execute(request, cep)
    return _json_response(controller)


@search_api_rate_limit
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


@search_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiBuscarEnderecoView(request):
    controller = NominatimSearch()
    controller.search(request)
    return _json_response(controller)


@search_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiReverseEnderecoView(request):
    controller = NominatimSearch()
    controller.reverse(request)
    return _json_response(controller)


@admin_write_rate_limit
@public_api_rate_limit
@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCorretoresView(request):
    controller = ApiCorretores()
    controller.execute(request)
    return _json_response(controller)


@admin_write_rate_limit
@public_api_rate_limit
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCorretorDetailView(request, pk):
    controller = ApiCorretorDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@admin_write_rate_limit
@public_api_rate_limit
@api_view(["GET", "POST"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCidadesView(request):
    controller = ApiCidades()
    controller.execute(request)
    return _json_response(controller)


@admin_write_rate_limit
@public_api_rate_limit
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsSuperUserOrReadOnly])
def ApiCidadeDetailView(request, pk):
    controller = ApiCidadeDetail()
    controller.execute(request, pk)
    return _json_response(controller)


@user_api_rate_limit
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ApiFavoritosView(request):
    favoritos = FavoritoImovel.objects.filter(usuario=request.user).values_list("imovel_id", flat=True)
    return JsonResponse({"results": list(favoritos)})


@user_api_rate_limit
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


def _admin_user_payload(user):
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


def _request_bool(data, key, fallback):
    value = data.get(key, fallback)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "sim", "yes", "on"}
    return bool(value)


@admin_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUser])
def ApiUsuariosView(request):
    User = get_user_model()
    users = User.objects.order_by("username")
    return JsonResponse({"results": [_admin_user_payload(user) for user in users]})


@admin_write_rate_limit
@admin_api_rate_limit
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsSuperUser])
def ApiUsuarioDetailView(request, user_id):
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"message": "Usuário não encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_admin_user_payload(user))

    data = request.data
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()

    if not username:
        return JsonResponse({"message": "Usuário é obrigatório."}, status=400)
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"message": "E-mail inválido."}, status=400)

    if User.objects.exclude(pk=user.pk).filter(username=username).exists():
        return JsonResponse({"message": "Este usuário já existe."}, status=400)
    if email and User.objects.exclude(pk=user.pk).filter(email=email).exists():
        return JsonResponse({"message": "Este e-mail já está em uso."}, status=400)

    next_is_active = _request_bool(data, "is_active", user.is_active)
    if user.pk == request.user.pk and not next_is_active:
        return JsonResponse({"message": "Você não pode desativar o usuário em uso."}, status=400)

    user.username = username
    user.email = email
    user.first_name = (data.get("first_name") or "").strip()
    user.last_name = (data.get("last_name") or "").strip()
    user.is_active = next_is_active
    user.is_staff = _request_bool(data, "is_staff", user.is_staff)
    if user.pk != request.user.pk:
        user.is_superuser = _request_bool(data, "is_superuser", user.is_superuser)
    user.save(update_fields=["username", "email", "first_name", "last_name", "is_active", "is_staff", "is_superuser"])
    return JsonResponse(_admin_user_payload(user))


@admin_write_rate_limit
@api_view(["POST"])
@permission_classes([IsSuperUser])
def ApiUsuarioResetLinkView(request, user_id):
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"message": "Usuário não encontrado."}, status=404)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_base_url = settings.PUBLIC_BASE_URL
    reset_url = f"{frontend_base_url.rstrip('/')}/resetar-senha/{uid}/{token}/"
    return JsonResponse(
        {
            "uid": uid,
            "token": token,
            "reset_url": reset_url,
            "message": "Link gerado com token padrão do Django. Envie ao usuário para que ele redefina a própria senha.",
        }
    )


@admin_api_rate_limit
@api_view(["GET"])
@permission_classes([IsSuperUser])
def ApiIntegracoesHealthView(request):
    checks = [
        _health_get_json(
            name="Nominatim",
            service="Busca inteligente de endereço",
            url="https://nominatim.openstreetmap.org/search",
            params={"q": "Ponta do Sol", "format": "jsonv2", "addressdetails": 1, "limit": 1, "countrycodes": "br"},
            headers={"User-Agent": NominatimSearch.UserAgent},
            controllers=["api_buscar_endereco.py", "api_buscar_coordenadas.py"],
            validate=lambda payload: isinstance(payload, list) and len(payload) > 0,
        ),
        _health_get_json(
            name="ViaCEP",
            service="Consulta de CEP",
            url="https://viacep.com.br/ws/01310930/json/",
            controllers=["api_buscar_cep.py", "api_cadastro_imoveis.py"],
            validate=lambda payload: isinstance(payload, dict) and not payload.get("erro") and bool(payload.get("cep")),
        ),
        _health_get_json(
            name="Geoapify",
            service="Pontos de interesse pagos/otimizados",
            url=ApiBuscarPontosInteresse.geoapify_endpoint,
            params={
                "categories": "catering",
                "filter": "circle:-46.655981,-23.561684,1200",
                "bias": "proximity:-46.655981,-23.561684",
                "limit": 1,
                "lang": "pt",
                "apiKey": _setting_or_env("GEOAPIFY_API_KEY"),
            },
            headers={"User-Agent": ApiBuscarPontosInteresse.user_agent},
            api_key_env="GEOAPIFY_API_KEY",
            controllers=["api_buscar_pontos_interesse.py", "sync_pontos_interesse.py"],
            validate=lambda payload: isinstance(payload, dict) and isinstance(payload.get("features"), list),
            skip_without_key=True,
        ),
        _health_get_json(
            name="Foursquare",
            service="Pontos de interesse pagos/alternativos",
            url=ApiBuscarPontosInteresse.foursquare_endpoint,
            params={
                "query": "restaurant",
                "ll": "-23.561684,-46.655981",
                "radius": 1200,
                "limit": 1,
                "fields": "fsq_place_id,name,latitude,longitude,categories,location,distance",
            },
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {_setting_or_env('FOURSQUARE_API_KEY')}",
                "User-Agent": ApiBuscarPontosInteresse.user_agent,
                "X-Places-Api-Version": "2025-06-17",
            },
            api_key_env="FOURSQUARE_API_KEY",
            controllers=["api_buscar_pontos_interesse.py", "sync_pontos_interesse.py"],
            validate=lambda payload: isinstance(payload, dict) and isinstance(payload.get("results"), list),
            skip_without_key=True,
        ),
        _health_post_json(
            name="Overpass",
            service="Pontos de interesse no mapa",
            url="https://overpass-api.de/api/interpreter",
            body="""
[out:json][timeout:12];
node["name"]["amenity"="restaurant"](around:1200,-23.561684,-46.655981);
out 1;
""".strip(),
            headers={"User-Agent": ApiBuscarPontosInteresse.user_agent, "Content-Type": "text/plain; charset=UTF-8"},
            controllers=["api_buscar_pontos_interesse.py", "sync_pontos_interesse.py"],
            validate=lambda payload: isinstance(payload, dict) and isinstance(payload.get("elements"), list),
        ),
    ]
    return JsonResponse(
        {
            "success": all(check["ok"] for check in checks),
            "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "results": checks,
        }
    )


def _health_get_json(
    name,
    service,
    url,
    params=None,
    headers=None,
    validate=None,
    api_key_env=None,
    controllers=None,
    skip_without_key=False,
):
    request_url = f"{url}?{parse.urlencode(params)}" if params else url
    return _health_request_json(
        name=name,
        service=service,
        url=url,
        request_url=request_url,
        method="GET",
        headers=headers,
        request_body=None,
        api_key_env=api_key_env,
        controllers=controllers,
        skip_without_key=skip_without_key,
        validate=validate,
    )


def _health_post_json(name, service, url, body, headers=None, validate=None, api_key_env=None, controllers=None):
    return _health_request_json(
        name=name,
        service=service,
        url=url,
        request_url=url,
        method="POST",
        body=body.encode("utf-8"),
        request_body=body,
        headers=headers,
        api_key_env=api_key_env,
        controllers=controllers,
        validate=validate,
    )


def _lembrete_config_payload(config):
    horario = config.horario
    if isinstance(horario, str):
        horario = parse_time(horario)
    corretor = config.whatsapp_corretor
    numero_ativo = ""
    if config.whatsapp_destino == "manual":
        numero_ativo = config.whatsapp_numero_manual
    elif corretor:
        numero_ativo = corretor.whatsapp or corretor.telefone

    return {
        "horario": horario.strftime("%H:%M") if horario else "09:00",
        "ativo": config.ativo,
        "whatsapp_mensagem": config.whatsapp_mensagem,
        "whatsapp_destino": config.whatsapp_destino,
        "whatsapp_corretor_id": corretor.pk if corretor else None,
        "whatsapp_corretor": {
            "id": corretor.pk,
            "nome": corretor.nome,
            "telefone": corretor.telefone,
            "whatsapp": corretor.whatsapp,
            "email": corretor.email,
        } if corretor else None,
        "whatsapp_numero_manual": config.whatsapp_numero_manual,
        "whatsapp_numero_ativo": numero_ativo,
        "cron_instalado": config.cron_instalado,
        "cron_linha": config.cron_linha,
        "ultima_atualizacao_cron": config.ultima_atualizacao_cron.isoformat() if config.ultima_atualizacao_cron else None,
        "atualizado_em": config.atualizado_em.isoformat() if config.atualizado_em else None,
    }


def _lembrete_stats_payload():
    favoritos_disponiveis = FavoritoImovel.objects.filter(imovel__status="disponivel")
    top_imoveis = favoritos_disponiveis.values("imovel_id", "imovel__titulo").annotate(total=Count("id")).order_by("-total")[:5]
    return {
        "favoritos_cadastrados": FavoritoImovel.objects.count(),
        "favoritos_disponiveis": favoritos_disponiveis.count(),
        "clientes_com_favoritos": favoritos_disponiveis.values("usuario_id").distinct().count(),
        "imoveis_favoritados": favoritos_disponiveis.values("imovel_id").distinct().count(),
        "imoveis_disponiveis": Imovel.objects.filter(status="disponivel").count(),
        "top_imoveis": [
            {
                "id": item["imovel_id"],
                "titulo": item["imovel__titulo"],
                "favoritos": item["total"],
                "clientes": [
                    {
                        "id": favorito.usuario_id,
                        "nome": favorito.usuario.get_full_name() or favorito.usuario.get_username(),
                        "email": favorito.usuario.email,
                    }
                    for favorito in favoritos_disponiveis.filter(imovel_id=item["imovel_id"]).select_related("usuario").order_by("usuario__username")
                ],
            }
            for item in top_imoveis
        ],
    }


def _lembrete_historico_payload():
    registros = log.objects.filter(route="lembrete_favoritos").order_by("-criado_em")
    historico = []

    for registro in registros:
        try:
            response = json.loads(registro.erro)
        except (TypeError, JSONDecodeError, ValueError):
            response = {
                "status": "log",
                "mensagem": registro.erro,
            }

        historico.append(
            {
                "id": registro.pk,
                "executado_em": registro.criado_em.isoformat() if registro.criado_em else None,
                "horario": response.get("horario_configurado") or "",
                "status": response.get("status") or "log",
                "log": response.get("mensagem") or "",
                "response": response,
            }
        )

    return historico


@admin_write_rate_limit
@admin_api_rate_limit
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsSuperUser])
def ApiLembreteFavoritosView(request):
    config = LembreteFavoritosConfig.get_solo()

    if request.method == "GET":
        return JsonResponse(
            {
                "config": _lembrete_config_payload(config),
                "stats": _lembrete_stats_payload(),
                "historico": _lembrete_historico_payload(),
            }
        )

    data = request.data
    horario = parse_time(str(data.get("horario") or ""))
    if horario is None:
        return JsonResponse({"message": "Informe um horário válido no formato HH:MM."}, status=400)

    mensagem = (data.get("whatsapp_mensagem") or "").strip()
    if not mensagem:
        return JsonResponse({"message": "A mensagem do WhatsApp não pode ficar vazia."}, status=400)
    try:
        mensagem.format(
            titulo="Apartamento exemplo",
            url="https://maldonadocorretorimoveis.com.br/imoveis/1",
            preco="R$ 250.000,00",
            endereco="Rua exemplo",
        )
    except KeyError as exc:
        return JsonResponse({"message": f"Variável inválida na mensagem: {{{exc.args[0]}}}."}, status=400)
    except Exception:
        return JsonResponse({"message": "A mensagem possui formatação inválida."}, status=400)

    whatsapp_destino = (data.get("whatsapp_destino") or config.whatsapp_destino or "corretor").strip()
    if whatsapp_destino not in {"corretor", "manual"}:
        return JsonResponse({"message": "Destino do WhatsApp inválido."}, status=400)

    whatsapp_numero_manual = (data.get("whatsapp_numero_manual") or "").strip()
    whatsapp_corretor = None
    if whatsapp_destino == "manual":
        if not "".join(filter(str.isdigit, whatsapp_numero_manual)):
            return JsonResponse({"message": "Informe um número manual válido para o WhatsApp."}, status=400)
    else:
        corretor_id = data.get("whatsapp_corretor_id")
        if corretor_id:
            try:
                whatsapp_corretor = Corretor.objects.get(pk=corretor_id)
            except (Corretor.DoesNotExist, ValueError, TypeError):
                return JsonResponse({"message": "Corretor do WhatsApp não encontrado."}, status=400)

    sync_cron = _request_bool(data, "sync_cron", False)
    config.horario = horario
    config.ativo = _request_bool(data, "ativo", config.ativo)
    config.whatsapp_mensagem = mensagem
    config.whatsapp_destino = whatsapp_destino
    config.whatsapp_corretor = whatsapp_corretor
    config.whatsapp_numero_manual = whatsapp_numero_manual
    config.save(
        update_fields=[
            "horario",
            "ativo",
            "whatsapp_mensagem",
            "whatsapp_destino",
            "whatsapp_corretor",
            "whatsapp_numero_manual",
            "atualizado_em",
        ]
    )

    cron_ok = None
    cron_message = "Configuração salva"
    if sync_cron:
        try:
            cron_ok, cron_message = sync_crontab(config)
        except Exception:
            cron_ok = False
            cron_message = "Configuração salva. Não foi possível sincronizar o cron no servidor."
    return JsonResponse(
        {
            "config": _lembrete_config_payload(config),
            "stats": _lembrete_stats_payload(),
            "historico": _lembrete_historico_payload(),
            "cron_ok": cron_ok,
            "message": cron_message,
        }
    )


def _health_request_json(
    name,
    service,
    url,
    request_url,
    method,
    headers=None,
    body=None,
    request_body=None,
    validate=None,
    api_key_env=None,
    controllers=None,
    skip_without_key=False,
):
    started_at = time.monotonic()
    api_key = _setting_or_env(api_key_env) if api_key_env else ""
    has_api_key = bool(api_key) if api_key_env else None
    result = {
        "name": name,
        "service": service,
        "base_url": url,
        "url": request_url,
        "method": method,
        "ok": False,
        "configured": not skip_without_key or bool(api_key),
        "api_key_env": api_key_env,
        "api_key_masked": _mask_secret(api_key) if api_key_env else "Não utiliza chave",
        "controllers": controllers or [],
        "request_body": request_body or "",
        "status_code": None,
        "latency_ms": None,
        "message": "",
        "log": "",
    }

    if skip_without_key and not has_api_key:
        result["latency_ms"] = 0
        result["message"] = f"Chave {api_key_env} não configurada. Este provider fica inativo e o sistema usa fallback."
        result["log"] = json.dumps(
            {
                "configured": False,
                "api_key_env": api_key_env,
                "base_url": url,
                "controllers": controllers or [],
                "reason": "Variável de ambiente ausente.",
            },
            ensure_ascii=False,
            indent=2,
        )
        return result

    try:
        req = urlrequest.Request(request_url, data=body, headers=headers or {}, method=method)
        with urlrequest.urlopen(req, timeout=12) as response:
            raw = response.read().decode("utf-8")
            result["status_code"] = response.status
            result["latency_ms"] = round((time.monotonic() - started_at) * 1000)
            try:
                payload = json.loads(raw)
            except JSONDecodeError:
                result["message"] = "O provedor respondeu, mas não retornou JSON válido."
                result["log"] = json.dumps(
                    {
                        "request_url": _redact_url(request_url),
                        "base_url": url,
                        "status_code": response.status,
                        "latency_ms": result["latency_ms"],
                        "content_type": response.headers.get("Content-Type", ""),
                        "raw_response": raw[:4000],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                return result
            ok = validate(payload) if validate else True
            result["ok"] = 200 <= response.status < 300 and ok
            result["message"] = "Retornando dados normalmente." if result["ok"] else "Resposta recebida, mas sem dados úteis."
            result["log"] = json.dumps(
                {
                    "request_url": _redact_url(request_url),
                    "base_url": url,
                    "status_code": response.status,
                    "latency_ms": result["latency_ms"],
                    "sample": _payload_sample(payload),
                },
                ensure_ascii=False,
                indent=2,
            )
    except error.HTTPError as exc:
        result["status_code"] = exc.code
        result["latency_ms"] = round((time.monotonic() - started_at) * 1000)
        result["message"] = f"Erro HTTP {exc.code} ao consultar o provedor."
        result["log"] = json.dumps(
            {
                "request_url": _redact_url(request_url),
                "base_url": url,
                "status_code": exc.code,
                "raw_response": exc.read().decode("utf-8", errors="replace"),
            },
            ensure_ascii=False,
            indent=2,
        )
    except Exception:
        result["latency_ms"] = round((time.monotonic() - started_at) * 1000)
        result["message"] = "Falha ao consultar o provedor."
        result["log"] = traceback.format_exc()

    return result


def _setting_or_env(name):
    if not name:
        return ""
    from django.conf import settings

    return getattr(settings, name, "") or os.getenv(name, "")


def _mask_secret(value):
    if not value:
        return "Não configurada"
    if len(value) <= 8:
        return f"{value[:2]}••••"
    return f"{value[:4]}••••{value[-4:]}"


def _redact_url(url):
    parsed = parse.urlsplit(url)
    query = parse.parse_qsl(parsed.query, keep_blank_values=True)
    redacted = [
        (key, "••••" if key.lower() in {"apikey", "api_key", "key", "token"} else value)
        for key, value in query
    ]
    return parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parse.urlencode(redacted), parsed.fragment))


def _payload_sample(payload):
    if isinstance(payload, list):
        return {"count": len(payload), "items": payload[:1]}
    if isinstance(payload, dict):
        sample = dict(payload)
        if isinstance(sample.get("elements"), list):
            sample["elements"] = sample["elements"][:1]
            sample["elements_count"] = len(payload.get("elements") or [])
        return sample
    return payload
