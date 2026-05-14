import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework import status

from .base_controller import BaseController


class ApiBuscarPontosInteresse(BaseController):
    geoapify_endpoint = "https://api.geoapify.com/v2/places"
    foursquare_endpoint = "https://places-api.foursquare.com/places/search"
    overpass_endpoint = "https://overpass-api.de/api/interpreter"
    user_agent = "MaldonadoCorretagem/1.0"
    geoapify_categories = (
        ("restaurante", "catering"),
        ("mercado", "commercial.supermarket,commercial.shopping_mall,commercial.marketplace"),
        ("loja", "commercial"),
        ("turismo", "tourism,entertainment"),
    )
    foursquare_queries = (
        ("restaurante", "restaurante"),
        ("restaurante", "restaurant"),
        ("restaurante", "bar"),
        ("restaurante", "cafe"),
        ("restaurante", "lanchonete"),
        ("restaurante", "hamburgueria"),
        ("mercado", "supermercado"),
        ("mercado", "mercado"),
        ("mercado", "shopping"),
        ("loja", "loja"),
        ("loja", "store"),
        ("loja", "farmacia"),
        ("loja", "padaria"),
        ("turismo", "cinema"),
        ("turismo", "teatro"),
        ("turismo", "museu"),
        ("turismo", "ponto turistico"),
    )

    def execute(self, latitude, longitude, *, radius: int = 5000, limit: int = 500, origins=None) -> bool:
        try:
            lat = float(latitude)
            lng = float(longitude)
            radius = max(1000, min(int(radius), 20000))
            limit = max(100, min(int(limit), 1000))
            elements = []
            search_origins = self._normalizar_origens(lat, lng, origins)
            for origin_lat, origin_lng in search_origins:
                if self._geoapify_api_key():
                    elements.extend(self._buscar_geoapify(origin_lat, origin_lng, radius=radius, limit=limit))
                if self._foursquare_api_key():
                    elements.extend(self._buscar_foursquare(origin_lat, origin_lng, radius=radius, limit=limit))

            elements = self._deduplicar_elements(elements)[:limit]
            if elements:
                return self.success(
                    {
                        "success": True,
                        "provider": "geoapify+foursquare",
                        "data": {"elements": elements},
                    },
                    status.HTTP_200_OK,
                )

            return self._execute_overpass(lat, lng, radius=radius, limit=limit)
        except Exception as e:
            return self.error(
                "Erro ao consultar pontos de interesse: " + str(e),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                {"success": False, "message": "Erro ao consultar pontos de interesse: " + str(e)},
            )

    def _geoapify_api_key(self):
        configured = getattr(settings, "GEOAPIFY_API_KEY", "")
        return configured or os.getenv("GEOAPIFY_API_KEY", "")

    def _foursquare_api_key(self):
        configured = getattr(settings, "FOURSQUARE_API_KEY", "")
        return configured or os.getenv("FOURSQUARE_API_KEY", "")

    def _normalizar_origens(self, lat, lng, origins):
        normalized = []
        seen = set()
        raw_origins = [(lat, lng)] + list(origins or [])
        for origin in raw_origins:
            try:
                origin_lat, origin_lng = origin
                origin_lat = float(origin_lat)
                origin_lng = float(origin_lng)
            except (TypeError, ValueError):
                continue
            key = (round(origin_lat, 4), round(origin_lng, 4))
            if key in seen:
                continue
            seen.add(key)
            normalized.append((origin_lat, origin_lng))
        return normalized[:25]

    def _deduplicar_elements(self, elements):
        deduplicated = []
        seen_ids = set()
        seen_names = set()
        for element in elements:
            tags = element.get("tags") or {}
            nome = (tags.get("name") or "").casefold().strip()
            lat = round(float(element.get("lat")), 4)
            lng = round(float(element.get("lon")), 4)
            id_key = (element.get("type"), str(element.get("id")))
            name_key = (nome, lat, lng)
            if id_key in seen_ids or name_key in seen_names:
                continue
            seen_ids.add(id_key)
            seen_names.add(name_key)
            deduplicated.append(element)
        return deduplicated

    def _buscar_geoapify(self, lat, lng, *, radius: int, limit: int):
        api_key = self._geoapify_api_key()
        elements = []
        seen = set()
        seen_names = set()
        limit_per_group = max(20, min(limit // len(self.geoapify_categories), 100))

        for category_group, categories in self.geoapify_categories:
            params = {
                "categories": categories,
                "filter": f"circle:{lng},{lat},{radius}",
                "bias": f"proximity:{lng},{lat}",
                "limit": limit_per_group,
                "lang": "pt",
                "apiKey": api_key,
            }
            request = Request(
                self.geoapify_endpoint + "?" + urlencode(params),
                headers={"User-Agent": self.user_agent},
            )
            try:
                with urlopen(request, timeout=20) as resposta:
                    payload = json.loads(resposta.read().decode("utf-8"))
            except (HTTPError, URLError, TimeoutError):
                continue

            for feature in payload.get("features", []):
                element = self._normalizar_geoapify_feature(feature, category_group)
                if not element:
                    continue
                key = (element["type"], element["id"])
                name_key = (
                    category_group,
                    (element.get("tags") or {}).get("name", "").casefold().strip(),
                )
                if key in seen or name_key in seen_names:
                    continue
                seen.add(key)
                seen_names.add(name_key)
                elements.append(element)

        return elements

    def _normalizar_geoapify_feature(self, feature, category_group):
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if len(coordinates) < 2:
            return None

        lng, lat = coordinates[0], coordinates[1]
        nome = (
            properties.get("name")
            or properties.get("address_line1")
            or properties.get("formatted")
            or ""
        ).strip()
        if not nome:
            return None

        datasource = properties.get("datasource") or {}
        raw = datasource.get("raw") or {}
        place_id = (
            properties.get("place_id")
            or raw.get("osm_id")
            or f"{category_group}:{lat:.7f}:{lng:.7f}:{nome.lower()}"
        )
        tags = {
            "name": nome,
            "geoapify_category": category_group,
            "categories": properties.get("categories") or [],
            "address_line1": properties.get("address_line1", ""),
            "address_line2": properties.get("address_line2", ""),
            "formatted": properties.get("formatted", ""),
            "website": properties.get("website", ""),
            "phone": properties.get("phone", ""),
        }
        if raw.get("amenity"):
            tags["amenity"] = raw.get("amenity")
        if raw.get("shop"):
            tags["shop"] = raw.get("shop")
        if raw.get("tourism"):
            tags["tourism"] = raw.get("tourism")
        if raw.get("leisure"):
            tags["leisure"] = raw.get("leisure")

        return {
            "type": "geoapify",
            "id": str(place_id),
            "lat": lat,
            "lon": lng,
            "tags": tags,
        }

    def _buscar_foursquare(self, lat, lng, *, radius: int, limit: int):
        api_key = self._foursquare_api_key()
        elements = []
        limit_per_query = max(10, min(50, limit // len(self.foursquare_queries)))

        for category_group, query in self.foursquare_queries:
            params = {
                "query": query,
                "ll": f"{lat},{lng}",
                "radius": radius,
                "limit": limit_per_query,
                "fields": "fsq_place_id,name,latitude,longitude,categories,location,distance",
            }
            request = Request(
                self.foursquare_endpoint + "?" + urlencode(params),
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": self.user_agent,
                    "X-Places-Api-Version": "2025-06-17",
                },
            )
            try:
                with urlopen(request, timeout=20) as resposta:
                    payload = json.loads(resposta.read().decode("utf-8"))
            except (HTTPError, URLError, TimeoutError):
                continue

            for item in payload.get("results", []):
                element = self._normalizar_foursquare_place(item, category_group)
                if element:
                    elements.append(element)

        return elements

    def _normalizar_foursquare_place(self, item, category_group):
        lat = item.get("latitude")
        lng = item.get("longitude")
        nome = (item.get("name") or "").strip()
        fsq_id = item.get("fsq_place_id")
        if not nome or lat is None or lng is None or not fsq_id:
            return None

        location = item.get("location") or {}
        categories = item.get("categories") or []
        category_names = [
            category.get("label") or category.get("name")
            for category in categories
            if category.get("label") or category.get("name")
        ]
        tags = {
            "name": nome,
            "foursquare_category": category_group,
            "categories": category_names,
            "address_line1": location.get("formatted_address") or location.get("address", ""),
            "formatted": location.get("formatted_address") or location.get("address", ""),
            "distance": item.get("distance"),
        }
        return {
            "type": "foursquare",
            "id": str(fsq_id),
            "lat": lat,
            "lon": lng,
            "tags": tags,
        }

    def _execute_overpass(self, lat, lng, *, radius: int, limit: int) -> bool:
        try:
            query = f"""
[out:json][timeout:25];
(
  node["name"]["amenity"~"restaurant|fast_food|cafe|bar|pub|ice_cream|food_court"](around:{radius},{lat},{lng});
  way["name"]["amenity"~"restaurant|fast_food|cafe|bar|pub|ice_cream|food_court"](around:{radius},{lat},{lng});
  relation["name"]["amenity"~"restaurant|fast_food|cafe|bar|pub|ice_cream|food_court"](around:{radius},{lat},{lng});
  node["name"]["shop"~"supermarket|convenience|mall|bakery|greengrocer|butcher|beverages|department_store"](around:{radius},{lat},{lng});
  way["name"]["shop"~"supermarket|convenience|mall|bakery|greengrocer|butcher|beverages|department_store"](around:{radius},{lat},{lng});
  relation["name"]["shop"~"supermarket|convenience|mall|bakery|greengrocer|butcher|beverages|department_store"](around:{radius},{lat},{lng});
  node["name"]["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|hotel"](around:{radius},{lat},{lng});
  way["name"]["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|hotel"](around:{radius},{lat},{lng});
  relation["name"]["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|hotel"](around:{radius},{lat},{lng});
);
out center {limit};
"""
            request = Request(
                self.overpass_endpoint,
                data=query.encode("utf-8"),
                headers={
                    "User-Agent": self.user_agent,
                    "Content-Type": "text/plain; charset=UTF-8",
                },
            )
            with urlopen(request, timeout=30) as resposta:
                payload = json.loads(resposta.read().decode("utf-8"))

            return self.success(
                {
                    "success": True,
                    "provider": "overpass",
                    "data": {"elements": payload.get("elements", [])},
                },
                status.HTTP_200_OK,
            )
        except HTTPError as e:
            return self.error(
                f"Falha ao consultar pontos de interesse. HTTP {e.code}.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": f"Falha ao consultar pontos de interesse. HTTP {e.code}."},
            )
        except URLError:
            return self.error(
                "Não foi possível consultar o serviço de pontos de interesse no momento.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": "Não foi possível consultar o serviço de pontos de interesse no momento."},
            )
        except Exception as e:
            return self.error(
                "Erro ao consultar pontos de interesse: " + str(e),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                {"success": False, "message": "Erro ao consultar pontos de interesse: " + str(e)},
            )
