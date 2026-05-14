from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken


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
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": _user_payload(user),
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)
    if not user.is_active:
        return JsonResponse({"detail": "Usuário inativo."}, status=403)
    return JsonResponse(_session_payload(user), status=200)


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
