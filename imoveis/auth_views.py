from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .rate_limits import auth_login_rate_limit, auth_password_reset_rate_limit, auth_refresh_rate_limit, auth_register_rate_limit


def _user_payload(user):
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
    }


def _session_payload(user):
    return {
        "user": _user_payload(user),
    }


def _cookie_kwargs(max_age):
    kwargs = {
        "max_age": int(max_age.total_seconds()),
        "secure": settings.JWT_AUTH_COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.JWT_AUTH_COOKIE_SAMESITE,
        "path": "/",
    }
    if settings.JWT_AUTH_COOKIE_DOMAIN:
        kwargs["domain"] = settings.JWT_AUTH_COOKIE_DOMAIN
    return kwargs


def _set_auth_cookies(response, refresh):
    response.set_cookie(
        settings.JWT_AUTH_COOKIE,
        str(refresh.access_token),
        **_cookie_kwargs(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]),
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE,
        str(refresh),
        **_cookie_kwargs(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
    )
    return response


def _clear_auth_cookies(response):
    response.delete_cookie(settings.JWT_AUTH_COOKIE, path="/", domain=settings.JWT_AUTH_COOKIE_DOMAIN)
    response.delete_cookie(settings.JWT_REFRESH_COOKIE, path="/", domain=settings.JWT_AUTH_COOKIE_DOMAIN)
    return response


@auth_login_rate_limit
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not email or not password:
        return JsonResponse({"detail": "E-mail e senha são obrigatórios."}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"detail": "E-mail inválido."}, status=400)

    User = get_user_model()
    try:
        user_by_email = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)
    except User.MultipleObjectsReturned:
        return JsonResponse({"detail": "E-mail duplicado. Entre em contato com o suporte."}, status=409)

    user = authenticate(request, username=user_by_email.get_username(), password=password)
    if user is None:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)
    if not user.is_active:
        return JsonResponse({"detail": "Usuário inativo."}, status=403)
    response = JsonResponse(_session_payload(user), status=200)
    return _set_auth_cookies(response, RefreshToken.for_user(user))


@auth_refresh_rate_limit
@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_view(request):
    token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE) or request.data.get("refresh")
    if not token:
        return JsonResponse({"detail": "Sessão expirada."}, status=401)

    try:
        refresh = RefreshToken(token)
        user = get_user_model().objects.get(pk=refresh["user_id"], is_active=True)
    except (TokenError, get_user_model().DoesNotExist, KeyError):
        response = JsonResponse({"detail": "Sessão expirada."}, status=401)
        return _clear_auth_cookies(response)

    response = JsonResponse(_session_payload(user), status=200)
    return _set_auth_cookies(response, refresh)


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    return _clear_auth_cookies(JsonResponse({"success": True}, status=200))


@auth_register_rate_limit
@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    username = (request.data.get("username") or "").strip()
    email = (request.data.get("email") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return JsonResponse({"detail": "Usuário e senha são obrigatórios."}, status=400)
    if len(password) < 8:
        return JsonResponse({"detail": "A senha precisa ter pelo menos 8 caracteres."}, status=400)
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"detail": "E-mail inválido."}, status=400)

    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return JsonResponse({"detail": "Este usuário já existe."}, status=400)
    if email and User.objects.filter(email=email).exists():
        return JsonResponse({"detail": "Este e-mail já está em uso."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    return JsonResponse({"user": _user_payload(user)}, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return JsonResponse({"user": _user_payload(request.user)}, status=200)


@auth_password_reset_rate_limit
@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    uid = request.data.get("uid") or ""
    token = request.data.get("token") or ""
    password = request.data.get("password") or ""

    if not uid or not token or not password:
        return JsonResponse({"detail": "Link e nova senha são obrigatórios."}, status=400)

    User = get_user_model()
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except Exception:
        return JsonResponse({"detail": "Link de redefinição inválido."}, status=400)

    if not default_token_generator.check_token(user, token):
        return JsonResponse({"detail": "Link de redefinição expirado ou inválido."}, status=400)

    try:
        validate_password(password, user)
    except ValidationError as exc:
        return JsonResponse({"detail": " ".join(exc.messages)}, status=400)

    user.set_password(password)
    user.save(update_fields=["password"])
    return JsonResponse({"success": True}, status=200)
