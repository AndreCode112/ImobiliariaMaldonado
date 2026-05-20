import json
import re
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.transaction import on_commit
from django.db.models import Case, IntegerField, Q, Value, When
from django.http import HttpRequest
from rest_framework import status

from imoveis.models import Bairro, Cidade, Corretor, ImagemImovel, Imovel
from imoveis.background_tasks import enqueue_pontos_interesse_sync

from .api_buscar_cep import ApiBuscarCep
from .api_buscar_coordenadas import ApiBuscarCoordenadas
from .base_controller import BaseController


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGES_PER_PROPERTY = 15
MAX_IMAGE_SIZE = 2 * 1024 * 1024
MAX_TOTAL_IMAGE_SIZE = 25 * 1024 * 1024
DEFAULT_PAGE_SIZE = 48
MAX_PAGE_SIZE = 120


def _cidade_dict(cidade):
    return {
        "id": cidade.pk,
        "nome": cidade.nome,
        "estado": cidade.estado,
        "codigo_ibge": cidade.codigo_ibge,
        "latitude": str(cidade.latitude) if cidade.latitude is not None else "",
        "longitude": str(cidade.longitude) if cidade.longitude is not None else "",
        "pontos_sincronizados_em": cidade.pontos_sincronizados_em.isoformat() if cidade.pontos_sincronizados_em else None,
    }


def _corretor_dict(corretor):
    return {
        "id": corretor.pk,
        "nome": corretor.nome,
        "telefone": corretor.telefone,
        "whatsapp": corretor.whatsapp,
        "email": corretor.email,
        "creci": corretor.creci,
        "ativo": corretor.ativo,
        "foto_url": corretor.foto.url if corretor.foto else None,
    }


def _ponto_interesse_dict(ponto):
    return ponto.to_map_dict()


def _imovel_dict(imovel):
    return {
        "id": imovel.pk,
        "uuid": str(imovel.uuid),
        "titulo": imovel.titulo,
        "descricao": imovel.descricao,
        "preco": str(imovel.preco),
        "preco_formatado": imovel.preco_formatado,
        "cep": imovel.cep,
        "endereco": imovel.endereco,
        "area": str(imovel.area),
        "quartos": imovel.quartos,
        "banheiros": imovel.banheiros,
        "vagas": imovel.vagas,
        "cozinhas": imovel.cozinhas,
        "salas": imovel.salas,
        "varandas": imovel.varandas,
        "status": imovel.status,
        "destaque": imovel.destaque,
        "finalidade": imovel.finalidade,
        "latitude": str(imovel.latitude) if imovel.latitude is not None else "",
        "longitude": str(imovel.longitude) if imovel.longitude is not None else "",
        "tipo": {"id": imovel.tipo.pk, "nome": imovel.tipo.nome} if imovel.tipo else None,
        "cidade": _cidade_dict(imovel.cidade) if imovel.cidade else None,
        "bairro": {"id": imovel.bairro.pk, "nome": imovel.bairro.nome} if imovel.bairro else None,
        "corretor": _corretor_dict(imovel.corretor) if imovel.corretor else None,
        "pontos_interesse": [
            _ponto_interesse_dict(ponto)
            for ponto in imovel.cidade.pontos_interesse.all()
        ]
        if imovel.cidade
        else [],
        "imagens": [
            {
                "id": img.pk,
                "url": img.imagem.url,
                "legenda": img.legenda,
                "principal": img.principal,
                "ordem": img.ordem,
            }
            for img in imovel.imagens.all()
            if img.imagem
        ],
        "criado_em": imovel.criado_em.isoformat() if imovel.criado_em else None,
    }


def _imovel_list_dict(imovel):
    principal = next((img for img in list(imovel.imagens.all()) if img.imagem), None)
    return {
        "id": imovel.pk,
        "uuid": str(imovel.uuid),
        "titulo": imovel.titulo,
        "descricao": "",
        "preco": str(imovel.preco),
        "preco_formatado": imovel.preco_formatado,
        "cep": imovel.cep,
        "endereco": imovel.endereco,
        "area": str(imovel.area),
        "quartos": imovel.quartos,
        "banheiros": imovel.banheiros,
        "vagas": imovel.vagas,
        "cozinhas": imovel.cozinhas,
        "salas": imovel.salas,
        "varandas": imovel.varandas,
        "status": imovel.status,
        "destaque": imovel.destaque,
        "finalidade": imovel.finalidade,
        "latitude": str(imovel.latitude) if imovel.latitude is not None else "",
        "longitude": str(imovel.longitude) if imovel.longitude is not None else "",
        "tipo": {"id": imovel.tipo.pk, "nome": imovel.tipo.nome} if imovel.tipo else None,
        "cidade": _cidade_dict(imovel.cidade) if imovel.cidade else None,
        "bairro": {"id": imovel.bairro.pk, "nome": imovel.bairro.nome} if imovel.bairro else None,
        "corretor": _corretor_dict(imovel.corretor) if imovel.corretor else None,
        "pontos_interesse": [],
        "imagens": [
            {
                "id": principal.pk,
                "url": principal.imagem.url,
                "legenda": principal.legenda,
                "principal": principal.principal,
                "ordem": principal.ordem,
            }
        ]
        if principal
        else [],
        "criado_em": imovel.criado_em.isoformat() if imovel.criado_em else None,
    }


def _positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    parsed = max(parsed, 1)
    return min(parsed, maximum) if maximum else parsed


def _paginated_response(request, qs, serializer):
    page = _positive_int(request.GET.get("page"), 1)
    page_size = _positive_int(request.GET.get("page_size"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    results = [serializer(item) for item in qs[start:end]]
    next_page = page + 1 if end < total else None
    previous_page = page - 1 if page > 1 else None
    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "next": next_page,
        "previous": previous_page,
        "results": results,
    }


def _get_imovel_for_response(pk):
    return (
        Imovel.objects.select_related("tipo", "cidade", "bairro", "corretor")
        .prefetch_related("imagens", "cidade__pontos_interesse")
        .get(pk=pk)
    )


def _get_imovel_by_uuid_for_response(public_uuid):
    return (
        Imovel.objects.select_related("tipo", "cidade", "bairro", "corretor")
        .prefetch_related("imagens", "cidade__pontos_interesse")
        .get(uuid=public_uuid)
    )


def _parse_request_payload(request: HttpRequest):
    data = getattr(request, "data", None)
    files = getattr(request, "FILES", None)
    if data is not None:
        return data, files

    if request.body:
        return json.loads(request.body), files
    return {}, files


def _data_get(data, key, default=None):
    return data.get(key, default) if hasattr(data, "get") else default


def _data_bool(data, key, default=False):
    value = _data_get(data, key, default)
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).lower() in {"1", "true", "on", "yes", "sim"}


def _decimal_or_none(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        raise ValidationError("Latitude e longitude precisam ser números válidos.")


def _decimal_input(value, label):
    if value in (None, ""):
        return Decimal("0")
    cleaned = re.sub(r"[^\d,.-]", "", str(value).strip())
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "." in cleaned and len(cleaned.rsplit(".", 1)[1]) == 3:
        cleaned = cleaned.replace(".", "")
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        raise ValidationError(f"{label} precisa ser um número válido.")


def _non_negative_int(value):
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return 0


def _format_cep(value):
    digits = re.sub(r"\D", "", str(value or ""))[:8]
    if not digits:
        return ""
    if len(digits) != 8:
        raise ValidationError("Informe um CEP com 8 dígitos.")
    return f"{digits[:5]}-{digits[5:]}"


def _decimal_coordinate(value, *, longitude=False):
    coord = _decimal_or_none(value)
    if coord is None:
        raise ValidationError("Coordenada inválida.")
    minimum = Decimal("-180") if longitude else Decimal("-90")
    maximum = Decimal("180") if longitude else Decimal("90")
    if coord < minimum or coord > maximum:
        raise ValidationError("Coordenada fora do intervalo permitido.")
    return coord.quantize(Decimal("0.0000001"))


def _data_json_list(data, key):
    value = _data_get(data, key)
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def _image_file_size(image):
    try:
        return image.imagem.size
    except Exception:
        return 0


def _validate_single_image(file):
    if not file:
        return
    name = file.name.lower()
    extension_ok = any(name.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS)
    content_type_ok = getattr(file, "content_type", "") in ALLOWED_IMAGE_CONTENT_TYPES
    if not extension_ok or not content_type_ok:
        raise ValidationError("Envie somente imagens JPG, JPEG, PNG ou WEBP.")
    if file.size > MAX_IMAGE_SIZE:
        raise ValidationError("A imagem pode ter no máximo 2 MB.")


def _validate_image_uploads(files, imovel=None, remove_ids=None):
    uploads = list(files.getlist("imagens")) if files and hasattr(files, "getlist") else []
    remove_ids = set(remove_ids or [])
    existing_images = imovel.imagens.exclude(pk__in=remove_ids) if imovel and imovel.pk else ImagemImovel.objects.none()
    existing_count = existing_images.count()
    existing_total = sum(_image_file_size(img) for img in existing_images)

    if existing_count + len(uploads) > MAX_IMAGES_PER_PROPERTY:
        raise ValidationError(f"Cada imóvel pode ter no máximo {MAX_IMAGES_PER_PROPERTY} imagens.")

    total_size = existing_total
    for file in uploads:
        _validate_single_image(file)
        total_size += file.size

    if total_size > MAX_TOTAL_IMAGE_SIZE:
        raise ValidationError("O total de imagens por imóvel pode ter no máximo 25 MB.")

    return uploads


def _delete_imovel_images(images):
    for image in images:
        if image.imagem:
            image.imagem.delete(save=False)
        image.delete()


def _sync_imovel_images(imovel, files, remove_ids=None):
    uploads = _validate_image_uploads(files, imovel=imovel, remove_ids=remove_ids)
    if remove_ids:
        _delete_imovel_images(ImagemImovel.objects.filter(imovel=imovel, pk__in=remove_ids))

    next_order = imovel.imagens.count()
    has_principal = imovel.imagens.filter(principal=True).exists()
    for index, file in enumerate(uploads):
        ImagemImovel.objects.create(
            imovel=imovel,
            imagem=file,
            principal=not has_principal and index == 0,
            ordem=next_order + index,
        )

    if not imovel.imagens.filter(principal=True).exists():
        first = imovel.imagens.order_by("ordem", "pk").first()
        if first:
            first.principal = True
            first.save(update_fields=["principal"])


def _extract_controller_data(controller):
    if not controller.response.get("success"):
        raise ValidationError(controller.response.get("message") or controller.strErr)
    return controller.response.get("data") or {}


def _geocode_query(query):
    controller = ApiBuscarCoordenadas()
    if not controller.execute(query):
        return None
    payload = _extract_controller_data(controller)
    return {
        "latitude": _decimal_coordinate(payload.get("latitude")),
        "longitude": _decimal_coordinate(payload.get("longitude"), longitude=True),
    }


def _ensure_cidade_from_cep_payload(payload):
    nome = payload.get("cidade") or payload.get("localidade")
    estado = (payload.get("uf") or "").upper()
    if not nome or not estado:
        raise ValidationError("O CEP não retornou cidade e UF válidas.")

    cidade, _created = Cidade.objects.get_or_create(
        nome=nome,
        estado=estado,
        defaults={"codigo_ibge": payload.get("ibge", "") or ""},
    )
    update_fields = []
    if payload.get("ibge") and cidade.codigo_ibge != payload.get("ibge"):
        cidade.codigo_ibge = payload.get("ibge")
        update_fields.append("codigo_ibge")
    if cidade.latitude is None or cidade.longitude is None:
        coords = _geocode_query(f"{cidade.nome}, {cidade.estado}, Brasil")
        if coords:
            cidade.latitude = coords["latitude"]
            cidade.longitude = coords["longitude"]
            update_fields.extend(["latitude", "longitude"])
    if update_fields:
        cidade.save(update_fields=list(dict.fromkeys(update_fields)))
    return cidade


def _ensure_bairro(cidade, nome):
    nome = (nome or "").strip()
    if not cidade or not nome:
        return None
    bairro, _created = Bairro.objects.get_or_create(cidade=cidade, nome=nome)
    return bairro


def _set_manual_coordinates(imovel, data):
    latitude_raw = _data_get(data, "latitude")
    longitude_raw = _data_get(data, "longitude")
    if latitude_raw in (None, "") and longitude_raw in (None, ""):
        return False

    latitude = _decimal_or_none(latitude_raw)
    longitude = _decimal_or_none(longitude_raw)
    if latitude is None or longitude is None:
        raise ValidationError("Informe latitude e longitude juntas.")
    imovel.latitude = _decimal_coordinate(latitude)
    imovel.longitude = _decimal_coordinate(longitude, longitude=True)
    return True


def _require_confirmed_coordinates(imovel):
    if imovel.latitude is None or imovel.longitude is None:
        raise ValidationError(
            "Confirme latitude e longitude antes de salvar. "
            "Use as coordenadas conferidas no Google Maps ou no mapa de sua preferência."
        )


def _set_imovel_fields(imovel, data):
    for field in ("titulo", "descricao", "endereco", "status", "finalidade"):
        value = _data_get(data, field)
        if value is not None:
            setattr(imovel, field, value)
    if _data_get(data, "cep") is not None:
        imovel.cep = _format_cep(_data_get(data, "cep"))
    if _data_get(data, "destaque") is not None:
        imovel.destaque = _data_bool(data, "destaque")
    for field, label in (("preco", "Preço"), ("area", "Área")):
        value = _data_get(data, field)
        if value is not None and value != "":
            setattr(imovel, field, _decimal_input(value, label))
    for field in ("quartos", "banheiros", "vagas", "cozinhas", "salas", "varandas"):
        value = _data_get(data, field)
        if value is not None and value != "":
            setattr(imovel, field, _non_negative_int(value))
    for field in ("tipo_id", "cidade_id", "corretor_id"):
        value = _data_get(data, field)
        if value is not None:
            setattr(imovel, field, value or None)
    bairro_nome = _data_get(data, "bairro_nome")
    if bairro_nome is not None:
        imovel.bairro = _ensure_bairro(imovel.cidade, bairro_nome)
    _set_manual_coordinates(imovel, data)


def _set_corretor_fields(corretor, data, files=None):
    for field in ("nome", "telefone", "whatsapp", "email", "creci"):
        value = _data_get(data, field)
        if value is not None:
            setattr(corretor, field, value)
    if _data_get(data, "ativo") is not None:
        corretor.ativo = _data_bool(data, "ativo", True)
    if _data_bool(data, "remove_foto", False) and corretor.foto:
        corretor.foto.delete(save=False)
        corretor.foto = None
    foto = files.get("foto") if files else None
    if foto:
        _validate_single_image(foto)
        if corretor.foto:
            corretor.foto.delete(save=False)
        corretor.foto = foto


def _validation_message(exc):
    return exc.messages[0] if hasattr(exc, "messages") else str(exc)


def _sync_imovel_pontos_interesse(imovel, *, force=False):
    on_commit(lambda: enqueue_pontos_interesse_sync(imovel.pk, force=force))


def _filter_imoveis_search(qs, query):
    query = (query or "").strip()
    if len(query) < 2:
        return qs

    tokens = [token for token in query.split() if len(token) >= 2]
    search_filter = Q()
    for token in tokens or [query]:
        search_filter &= (
            Q(titulo__icontains=token)
            | Q(tipo__nome__icontains=token)
            | Q(cidade__nome__icontains=token)
            | Q(bairro__nome__icontains=token)
            | Q(endereco__icontains=token)
            | Q(descricao__icontains=token)
            | Q(cep__icontains=token)
        )

    return (
        qs.filter(search_filter)
        .annotate(
            search_rank=Case(
                When(titulo__istartswith=query, then=Value(0)),
                When(tipo__nome__istartswith=query, then=Value(1)),
                When(cidade__nome__istartswith=query, then=Value(2)),
                When(titulo__icontains=query, then=Value(3)),
                When(tipo__nome__icontains=query, then=Value(4)),
                default=Value(5),
                output_field=IntegerField(),
            )
        )
        .order_by("search_rank", "-destaque", "-criado_em", "pk")
        .distinct()
    )


class ApiStats(BaseController):
    def execute(self, request: HttpRequest) -> bool:
        return self.success(
            {
                "imoveis": Imovel.objects.count(),
                "imoveis_disponiveis": Imovel.objects.filter(status="disponivel").count(),
                "corretores": Corretor.objects.filter(ativo=True).count(),
                "destaque": Imovel.objects.filter(destaque=True).count(),
            },
            status.HTTP_200_OK,
        )


class ApiImoveis(BaseController):
    def execute(self, request: HttpRequest) -> bool:
        if request.method == "GET":
            query = request.GET.get("q") or request.GET.get("search") or ""
            compact = request.GET.get("compact", "1") != "0"
            qs = (
                Imovel.objects.select_related("tipo", "cidade", "bairro", "corretor")
                .prefetch_related("imagens")
                .all()
            )
            if query:
                qs = _filter_imoveis_search(qs, query)
            serializer = _imovel_list_dict if compact else _imovel_dict
            if not compact:
                qs = qs.prefetch_related("cidade__pontos_interesse")
            return self.success(_paginated_response(request, qs, serializer), status.HTTP_200_OK)

        try:
            data, files = _parse_request_payload(request)
            with transaction.atomic():
                imovel = Imovel(
                    titulo=_data_get(data, "titulo", ""),
                    descricao=_data_get(data, "descricao", ""),
                    preco=_decimal_input(_data_get(data, "preco") or 0, "Preço"),
                    cep=_format_cep(_data_get(data, "cep", "")),
                    endereco=_data_get(data, "endereco", ""),
                    area=_decimal_input(_data_get(data, "area") or 0, "Área"),
                    quartos=_non_negative_int(_data_get(data, "quartos")),
                    banheiros=_non_negative_int(_data_get(data, "banheiros")),
                    vagas=_non_negative_int(_data_get(data, "vagas")),
                    cozinhas=_non_negative_int(_data_get(data, "cozinhas")),
                    salas=_non_negative_int(_data_get(data, "salas")),
                    varandas=_non_negative_int(_data_get(data, "varandas")),
                    status=_data_get(data, "status", "disponivel"),
                    destaque=_data_bool(data, "destaque", False),
                    finalidade=_data_get(data, "finalidade", ""),
                    tipo_id=_data_get(data, "tipo_id") or None,
                    cidade_id=_data_get(data, "cidade_id") or None,
                    corretor_id=_data_get(data, "corretor_id") or None,
                )
                imovel.save()
                bairro_nome = _data_get(data, "bairro_nome")
                if bairro_nome:
                    imovel.bairro = _ensure_bairro(imovel.cidade, bairro_nome)
                    imovel.save(update_fields=["bairro"])
                if _set_manual_coordinates(imovel, data):
                    imovel.save(update_fields=["latitude", "longitude"])
                _require_confirmed_coordinates(imovel)
                _sync_imovel_images(imovel, files)
                imovel = _get_imovel_for_response(imovel.pk)
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        _sync_imovel_pontos_interesse(imovel, force=True)
        return self.success(_imovel_dict(imovel), status.HTTP_201_CREATED)


class ApiImovelDetail(BaseController):
    def execute(self, request: HttpRequest, pk: int | None = None, public_uuid=None) -> bool:
        try:
            imovel = _get_imovel_by_uuid_for_response(public_uuid) if public_uuid else _get_imovel_for_response(pk)
        except Imovel.DoesNotExist:
            return self.error("Not found", status.HTTP_404_NOT_FOUND, {"error": "Not found"})

        if request.method == "GET":
            return self.success(_imovel_dict(imovel), status.HTTP_200_OK)

        if request.method == "DELETE":
            _delete_imovel_images(imovel.imagens.all())
            imovel.delete()
            return self.success({"ok": True}, status.HTTP_200_OK)

        try:
            data, files = _parse_request_payload(request)
            remove_ids = [int(item) for item in _data_json_list(data, "remove_image_ids") if str(item).isdigit()]
            with transaction.atomic():
                _set_imovel_fields(imovel, data)
                imovel.save()
                _require_confirmed_coordinates(imovel)
                _sync_imovel_images(imovel, files, remove_ids=remove_ids)
                imovel = _get_imovel_for_response(imovel.pk)
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        _sync_imovel_pontos_interesse(imovel, force=True)
        return self.success(_imovel_dict(imovel), status.HTTP_200_OK)


class ApiCorretores(BaseController):
    def execute(self, request: HttpRequest) -> bool:
        if request.method == "GET":
            return self.success({"results": [_corretor_dict(corretor) for corretor in Corretor.objects.all()]})

        try:
            data, files = _parse_request_payload(request)
            corretor = Corretor()
            _set_corretor_fields(corretor, data, files)
            corretor.save()
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        return self.success(_corretor_dict(corretor), status.HTTP_201_CREATED)


class ApiCorretorDetail(BaseController):
    def execute(self, request: HttpRequest, pk: int) -> bool:
        try:
            corretor = Corretor.objects.get(pk=pk)
        except Corretor.DoesNotExist:
            return self.error("Not found", status.HTTP_404_NOT_FOUND, {"error": "Not found"})

        if request.method == "GET":
            return self.success(_corretor_dict(corretor))

        if request.method == "DELETE":
            if corretor.foto:
                corretor.foto.delete(save=False)
            corretor.delete()
            return self.success({"ok": True})

        try:
            data, files = _parse_request_payload(request)
            _set_corretor_fields(corretor, data, files)
            corretor.save()
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        return self.success(_corretor_dict(corretor))


class ApiCidades(BaseController):
    def execute(self, request: HttpRequest) -> bool:
        if request.method == "GET":
            return self.success({"results": [_cidade_dict(cidade) for cidade in Cidade.objects.all()]})

        try:
            data, _files = _parse_request_payload(request)
            cidade = Cidade(
                nome=_data_get(data, "nome", ""),
                estado=(_data_get(data, "estado", "") or "").upper(),
                codigo_ibge=_data_get(data, "codigo_ibge", "") or "",
            )
            coords = _geocode_query(f"{cidade.nome}, {cidade.estado}, Brasil")
            if coords:
                cidade.latitude = coords["latitude"]
                cidade.longitude = coords["longitude"]
            cidade.save()
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        return self.success(_cidade_dict(cidade), status.HTTP_201_CREATED)


class ApiCidadeDetail(BaseController):
    def execute(self, request: HttpRequest, pk: int) -> bool:
        try:
            cidade = Cidade.objects.get(pk=pk)
        except Cidade.DoesNotExist:
            return self.error("Not found", status.HTTP_404_NOT_FOUND, {"error": "Not found"})

        if request.method == "GET":
            return self.success(_cidade_dict(cidade))

        if request.method == "DELETE":
            cidade.delete()
            return self.success({"ok": True})

        try:
            data, _files = _parse_request_payload(request)
            if _data_get(data, "nome") is not None:
                cidade.nome = _data_get(data, "nome")
            if _data_get(data, "estado") is not None:
                cidade.estado = (_data_get(data, "estado") or "").upper()
            if _data_get(data, "codigo_ibge") is not None:
                cidade.codigo_ibge = _data_get(data, "codigo_ibge") or ""
            if cidade.latitude is None or cidade.longitude is None or _data_get(data, "nome") is not None or _data_get(data, "estado") is not None:
                coords = _geocode_query(f"{cidade.nome}, {cidade.estado}, Brasil")
                if coords:
                    cidade.latitude = coords["latitude"]
                    cidade.longitude = coords["longitude"]
            cidade.save()
        except ValidationError as exc:
            return self.error(_validation_message(exc), status.HTTP_400_BAD_REQUEST, {"error": _validation_message(exc)})
        return self.success(_cidade_dict(cidade))


class ApiCepCadastro(BaseController):
    def execute(self, request: HttpRequest, cep: str) -> bool:
        controller = ApiBuscarCep()
        if not controller.execute(cep):
            return self.error(controller.strErr, controller.status, controller.response)

        payload = _extract_controller_data(controller)
        try:
            cidade = _ensure_cidade_from_cep_payload(payload)
            bairro = _ensure_bairro(cidade, payload.get("bairro", ""))
        except ValidationError as exc:
            message = _validation_message(exc)
            return self.error(message, status.HTTP_400_BAD_REQUEST, {"success": False, "message": message})

        return self.success(
            {
                "success": True,
                "data": {
                    **payload,
                    "cidade_id": cidade.pk,
                    "cidade": _cidade_dict(cidade),
                    "bairro_id": bairro.pk if bairro else None,
                    "bairro": bairro.nome if bairro else payload.get("bairro", ""),
                },
            },
            status.HTTP_200_OK,
        )
