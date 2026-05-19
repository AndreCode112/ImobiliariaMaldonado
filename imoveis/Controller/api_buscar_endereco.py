import hashlib
import json
import re
import unicodedata
from datetime import timedelta
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from .base_controller import BaseController
from .extract_data_request import extract_request_data
from django.http import HttpRequest
from django.db.models import F
from django.utils import timezone
from rest_framework import status

from imoveis.models import EnderecoBuscaCache


NOISE_WORDS = {
    "n",
    "no",
    "nº",
    "n°",
    "num",
    "numero",
    "número",
}

ABBREVIATIONS = {
    "r": "rua",
    "r.": "rua",
    "av": "avenida",
    "av.": "avenida",
    "aven": "avenida",
    "rod": "rodovia",
    "rod.": "rodovia",
    "trav": "travessa",
    "trav.": "travessa",
    "tv": "travessa",
    "tv.": "travessa",
    "cel": "coronel",
    "cel.": "coronel",
    "dr": "doutor",
    "dr.": "doutor",
    "prof": "professor",
    "prof.": "professor",
}


def normalize_address_query(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[º°]", " ", normalized)
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    tokens = []
    for token in normalized.split():
        token = ABBREVIATIONS.get(token, token)
        if token in NOISE_WORDS:
            continue
        tokens.append(token)
    return " ".join(tokens)


def cache_key_for_query(normalized_query: str) -> str:
    return hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()

class NominatimSearch(BaseController):

    BASE_URL = "https://nominatim.openstreetmap.org/search"
    limit: int = 5
    countrycodes: str = "br"
    UserAgent:str ="DashboardImoveis/1.0"
    cache_ttl_days: int = 180
    max_query_length: int = 160

    def __init__(self):
        super().__init__()
        self.response2:list[dict] = []


    def search(
        self,
        request:HttpRequest
    
    ) -> bool:

        try:
            
            data =  extract_request_data(request)
            query =  str(data.get('query') or request.GET.get('query', '')).strip()

            if not query:
                return self.error(
                    "Informe uma query para consultar endereços.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Informe uma query para consultar endereços."},
                )
            if len(query) > self.max_query_length:
                return self.error(
                    "A busca deve ter no máximo 160 caracteres.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "A busca deve ter no máximo 160 caracteres."},
                )

            normalized_query = normalize_address_query(query)
            if len(normalized_query) < 3:
                return self.error(
                    "Informe uma busca mais específica.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Informe uma busca mais específica."},
                )

            cache_key = cache_key_for_query(normalized_query)
            cached_results = self._cached_results(cache_key)
            if cached_results:
                return self.success(
                    {
                        "success": True,
                        "provider": "cache",
                        "query_normalizada": normalized_query,
                        "results": cached_results,
                    },
                    status.HTTP_200_OK,
                )

            suggestion_results = self._cached_suggestion_results(normalized_query)
            if suggestion_results:
                return self.success(
                    {
                        "success": True,
                        "provider": "cache_sugestoes",
                        "query_normalizada": normalized_query,
                        "results": suggestion_results,
                    },
                    status.HTTP_200_OK,
                )


            params = {
                "q": query,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": self.limit,
                "countrycodes": self.countrycodes
            }

            headers = {
                "User-Agent":self.UserAgent 
            }

            request_url = f"{self.BASE_URL}?{urlencode(params)}"
            request = Request(request_url, headers=headers)

            try:
                with urlopen(request, timeout=10) as response:
                    data = json.loads(response.read().decode("utf-8"))
            except HTTPError as error:
                self.status = error.code
                self.strErr = f"Erro na requisição ao tentar buscar endereços: {error.code}"
                self.response = {"success": False, "message": self.strErr}
                return False

            self.response2 = [
                {
                    "display_name": item.get("display_name"),
                    "latitude": item.get("lat"),
                    "longitude": item.get("lon"),
                    "place_id": str(item.get("place_id") or ""),
                    "type": item.get("type"),
                    "address": item.get("address", {})
                }
                for item in data
                if item.get("display_name") and item.get("lat") and item.get("lon")
            ]
            self._save_cache(query, normalized_query, cache_key, data, self.response2)

            return self.success(
                {
                    "success": True,
                    "provider": "nominatim",
                    "query_normalizada": normalized_query,
                    "results": self.response2,
                },
                status.HTTP_200_OK,
            )

        except Exception as error:
            self.status = status.HTTP_500_INTERNAL_SERVER_ERROR
            self.strErr = 'Erro ao extrair endereços: ' +  str(error)
            self.response = {"success": False, "message": self.strErr}
            return False

    def _cached_results(self, cache_key: str) -> list[dict]:
        now = timezone.now()
        queryset = EnderecoBuscaCache.objects.filter(
            provider="nominatim",
            cache_key=cache_key,
            expires_at__gt=now,
        ).order_by("result_index")[: self.limit]
        results = list(queryset)
        if not results:
            return []
        EnderecoBuscaCache.objects.filter(pk__in=[result.pk for result in results]).update(
            hits=F("hits") + 1,
            ultimo_uso_em=now,
        )
        return [result.to_result_dict() for result in results]

    def _cached_suggestion_results(self, normalized_query: str) -> list[dict]:
        if len(normalized_query) < 4:
            return []

        now = timezone.now()
        candidates = list(
            EnderecoBuscaCache.objects.filter(
                provider="nominatim",
                query_normalizada__startswith=normalized_query,
                expires_at__gt=now,
            ).order_by("-hits", "query_normalizada", "result_index")[:25]
        )

        if len(candidates) < self.limit:
            candidates.extend(
                list(
                    EnderecoBuscaCache.objects.filter(
                        provider="nominatim",
                        query_normalizada__icontains=normalized_query,
                        expires_at__gt=now,
                    )
                    .exclude(pk__in=[candidate.pk for candidate in candidates])
                    .order_by("-hits", "query_normalizada", "result_index")[:25]
                )
            )

        if not candidates:
            return []

        selected = []
        seen = set()
        for candidate in candidates:
            identity = candidate.place_id or f"{candidate.latitude}:{candidate.longitude}:{candidate.display_name}"
            if identity in seen:
                continue
            seen.add(identity)
            selected.append(candidate)
            if len(selected) >= self.limit:
                break

        EnderecoBuscaCache.objects.filter(pk__in=[result.pk for result in selected]).update(
            hits=F("hits") + 1,
            ultimo_uso_em=now,
        )
        return [result.to_result_dict() for result in selected]

    def _save_cache(self, query: str, normalized_query: str, cache_key: str, raw_data: list[dict], results: list[dict]) -> None:
        expires_at = timezone.now() + timedelta(days=self.cache_ttl_days)
        raw_by_place_id = {str(item.get("place_id") or ""): item for item in raw_data if isinstance(item, dict)}
        for index, result in enumerate(results[: self.limit]):
            place_id = str(result.get("place_id") or "")
            EnderecoBuscaCache.objects.update_or_create(
                provider="nominatim",
                cache_key=cache_key,
                result_index=index,
                defaults={
                    "query_original": query[:220],
                    "query_normalizada": normalized_query[:220],
                    "display_name": (result.get("display_name") or "")[:500],
                    "latitude": str(result.get("latitude") or ""),
                    "longitude": str(result.get("longitude") or ""),
                    "place_id": place_id[:80],
                    "tipo": str(result.get("type") or "")[:80],
                    "address": result.get("address") or {},
                    "raw_response": raw_by_place_id.get(place_id, result),
                    "expires_at": expires_at,
                },
            )
