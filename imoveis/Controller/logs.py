import json

from django.db.models import Q
from django.utils.dateparse import parse_date, parse_time
from rest_framework import status

from imoveis.models import log

from .api_buscar_cep import ApiBuscarCep
from .api_buscar_endereco import NominatimSearch
from .api_buscar_pontos_interesse import ApiBuscarPontosInteresse
from .api_cadastro_imoveis import (
    ApiCepCadastro,
    ApiCidadeDetail,
    ApiCidades,
    ApiCorretorDetail,
    ApiCorretores,
    ApiImovelDetail,
    ApiImoveis,
    ApiStats,
)
from .base_controller import BaseController

LOG_ROUTE_CLASSES = (
    ApiBuscarCep,
    ApiBuscarPontosInteresse,
    ApiCepCadastro,
    ApiCidadeDetail,
    ApiCidades,
    ApiCorretorDetail,
    ApiCorretores,
    ApiImovelDetail,
    ApiImoveis,
    ApiStats,
    NominatimSearch,
)


def _log_dict(item):
    return {
        "id": item.pk,
        "route": item.route,
        "message": item.erro,
        "criado_em": item.criado_em.isoformat() if item.criado_em else None,
    }


def _message_text(message):
    if isinstance(message, str):
        return message
    return json.dumps(message, ensure_ascii=False, default=str)


def _route_options():
    mapped_routes = {controller.__name__ for controller in LOG_ROUTE_CLASSES} | {"ApiLogs"}
    persisted_routes = set(log.objects.exclude(route="").values_list("route", flat=True).distinct())
    return sorted(mapped_routes | persisted_routes)


def _apply_log_filters(qs, request):
    query = (request.GET.get("query") or "").strip()
    route = (request.GET.get("route") or "").strip()
    date = parse_date(request.GET.get("date") or "")
    time_value = parse_time(request.GET.get("time") or "")

    if query:
        qs = qs.filter(Q(route__icontains=query) | Q(erro__icontains=query))
    if route:
        qs = qs.filter(route=route)
    if date:
        qs = qs.filter(criado_em__date=date)
    if time_value:
        qs = qs.filter(criado_em__hour=time_value.hour)
        if time_value.minute:
            qs = qs.filter(criado_em__minute=time_value.minute)

    return qs


class InsertLogs(BaseController):
    def execute(self, route: str, message) -> bool:
        try:
            log.objects.create(route=route, erro=_message_text(message))
            return self.success({"success": True, "message": "Log inserido com sucesso"}, status.HTTP_201_CREATED)
        except Exception as exc:
            return self.error("Erro ao inserir log", status.HTTP_500_INTERNAL_SERVER_ERROR, {"success": False, "message": str(exc)})


class ApiLogs(BaseController):
    def execute(self, request) -> bool:
        if request.method == "GET":
            limit = request.GET.get("limit", 250)
            try:
                limit = min(max(int(limit), 1), 500)
            except (TypeError, ValueError):
                limit = 250

            order = request.GET.get("order") if request.GET.get("order") in {"recent", "oldest"} else "recent"
            qs = _apply_log_filters(log.objects.all(), request)
            total = qs.count()
            ordering = ("criado_em", "pk") if order == "oldest" else ("-criado_em", "-pk")
            qs = qs.order_by(*ordering)[:limit]
            return self.success(
                {
                    "results": [_log_dict(item) for item in qs],
                    "routes": _route_options(),
                    "total": total,
                    "order": order,
                },
                status.HTTP_200_OK,
            )

        if request.method == "DELETE":
            ids = request.data.get("ids", [])
            if not isinstance(ids, list):
                return self.error(
                    "Informe uma lista de logs para deletar.",
                    status.HTTP_400_BAD_REQUEST,
                    {"message": "Informe uma lista de logs para deletar."},
                )

            clean_ids = [int(item) for item in ids if str(item).isdigit()]
            if not clean_ids:
                return self.error(
                    "Selecione pelo menos um log.",
                    status.HTTP_400_BAD_REQUEST,
                    {"message": "Selecione pelo menos um log."},
                )

            deleted, _ = log.objects.filter(pk__in=clean_ids).delete()
            return self.success({"deleted": deleted, "ids": clean_ids}, status.HTTP_200_OK)

        return self.error("Método não permitido.", status.HTTP_405_METHOD_NOT_ALLOWED, {"message": "Método não permitido."})
