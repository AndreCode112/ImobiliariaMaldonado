import hashlib
from decimal import Decimal, InvalidOperation

from imoveis.models import Cidade, Imovel, PontoInteresse

from .api_buscar_pontos_interesse import ApiBuscarPontosInteresse


MAX_PER_CATEGORY = {
    "restaurante": 80,
    "mercado": 60,
    "loja": 80,
    "turismo": 60,
    "parque": 40,
    "servico": 40,
}


def poi_category(tags):
    foursquare_category = tags.get("foursquare_category")
    if foursquare_category in MAX_PER_CATEGORY:
        return foursquare_category

    geoapify_category = tags.get("geoapify_category")
    if geoapify_category in MAX_PER_CATEGORY:
        return geoapify_category

    geoapify_categories = tags.get("categories") or []
    if any(category.startswith("catering") for category in geoapify_categories):
        return "restaurante"
    if any(category in {"commercial.supermarket", "commercial.shopping_mall", "commercial.marketplace"} for category in geoapify_categories):
        return "mercado"
    if any(category.startswith("commercial") for category in geoapify_categories):
        return "loja"
    if any(category.startswith(("tourism", "entertainment")) for category in geoapify_categories):
        return "turismo"
    if any(category.startswith(("leisure", "natural")) for category in geoapify_categories):
        return "parque"

    amenity = tags.get("amenity")
    shop = tags.get("shop")
    tourism = tags.get("tourism")
    leisure = tags.get("leisure")
    if amenity in {"restaurant", "fast_food", "cafe", "bar", "pub", "ice_cream", "food_court"}:
        return "restaurante"
    if shop in {"supermarket", "convenience", "mall", "bakery", "greengrocer", "butcher", "beverages", "department_store"}:
        return "mercado"
    if shop:
        return "loja"
    if tourism in {"attraction", "museum", "viewpoint", "gallery", "zoo", "theme_park", "hotel"}:
        return "turismo"
    if leisure in {"park", "garden", "sports_centre", "stadium", "pitch"}:
        return "parque"
    return "servico"


def decimal_coordinate(value):
    try:
        return Decimal(str(value)).quantize(Decimal("0.0000001"))
    except (InvalidOperation, TypeError, ValueError):
        return None


def stable_external_id(value):
    raw = str(value or "").strip()
    if len(raw) <= 40:
        return raw
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def sync_pontos_interesse_cidade(cidade: Cidade, *, force=False, radius=5000, limit=500):
    if not cidade:
        return 0

    origins = list(
        Imovel.objects.filter(cidade=cidade)
        .exclude(latitude__isnull=True)
        .exclude(longitude__isnull=True)
        .values_list("latitude", "longitude")
        .distinct()[:24]
    )
    if not origins and (cidade.latitude is None or cidade.longitude is None):
        return 0
    if cidade.pontos_sincronizados_em and not force:
        return 0

    if force:
        PontoInteresse.objects.filter(cidade=cidade).delete()

    base_lat = cidade.latitude if cidade.latitude is not None else origins[0][0]
    base_lng = cidade.longitude if cidade.longitude is not None else origins[0][1]
    controller = ApiBuscarPontosInteresse()
    if not controller.execute(base_lat, base_lng, radius=radius, limit=limit, origins=origins):
        return 0

    payload = controller.response.get("data") or {}
    elements = payload.get("elements") or []
    category_counts = {key: 0 for key in MAX_PER_CATEGORY}
    synced = 0

    for item in elements:
        tags = item.get("tags") or {}
        nome = (tags.get("name") or "").strip()
        lat = item.get("lat") or (item.get("center") or {}).get("lat")
        lng = item.get("lon") or (item.get("center") or {}).get("lon")
        external_id = stable_external_id(item.get("id"))
        external_type = str(item.get("type") or "")[:20]
        latitude = decimal_coordinate(lat)
        longitude = decimal_coordinate(lng)
        if not nome or latitude is None or longitude is None or not external_id or not external_type:
            continue

        categoria = poi_category(tags)
        if category_counts.get(categoria, 0) >= MAX_PER_CATEGORY.get(categoria, 40):
            continue

        PontoInteresse.objects.update_or_create(
            cidade=cidade,
            osm_type=external_type,
            osm_id=external_id,
            defaults={
                "nome": nome[:200],
                "categoria": categoria,
                "latitude": latitude,
                "longitude": longitude,
                "tags": {**tags, "source_id": str(item.get("id") or "")},
            },
        )
        category_counts[categoria] = category_counts.get(categoria, 0) + 1
        synced += 1

    cidade.marcar_pontos_sincronizados()
    return synced


def sync_pontos_interesse_imovel(imovel: Imovel, *, force=False):
    if not imovel or not imovel.cidade or imovel.latitude is None or imovel.longitude is None:
        return 0
    return sync_pontos_interesse_cidade(imovel.cidade, force=force)
