from functools import wraps

from django.conf import settings
from django.http import JsonResponse
from django_ratelimit import ALL, UNSAFE
from django_ratelimit.decorators import ratelimit


DEFAULT_RATELIMIT_RATES = {
    "auth.login.ip": "5/m",
    "auth.register.ip": "3/h",
    "auth.password_reset.ip": "5/h",
    "auth.refresh.ip": "20/m",
    "api.public.ip": "120/m",
    "api.search.ip": "30/m",
    "api.user.ip": "60/m",
    "api.admin.ip": "80/m",
    "api.admin.write.ip": "20/m",
}


def rate(name):
    return getattr(settings, "RATELIMIT_RATES", {}).get(name, DEFAULT_RATELIMIT_RATES[name])


def _limited_response():
    return JsonResponse(
        {
            "detail": "Muitas requisições. Aguarde um pouco e tente novamente.",
            "code": "rate_limited",
        },
        status=429,
    )


def _api_rate_limit(rate_name, *, method=ALL):
    def decorator(view_func):
        @wraps(view_func)
        @ratelimit(key="ip", rate=lambda _group, _request: rate(rate_name), method=method, block=False)
        def wrapped(request, *args, **kwargs):
            if getattr(request, "limited", False):
                return _limited_response()
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator


public_api_rate_limit = _api_rate_limit("api.public.ip")
search_api_rate_limit = _api_rate_limit("api.search.ip")
user_api_rate_limit = _api_rate_limit("api.user.ip")
admin_api_rate_limit = _api_rate_limit("api.admin.ip")
admin_write_rate_limit = _api_rate_limit("api.admin.write.ip", method=UNSAFE)


def auth_rate_limit(rate_name):
    return _api_rate_limit(rate_name, method="POST")


auth_login_rate_limit = auth_rate_limit("auth.login.ip")
auth_register_rate_limit = auth_rate_limit("auth.register.ip")
auth_password_reset_rate_limit = auth_rate_limit("auth.password_reset.ip")
auth_refresh_rate_limit = auth_rate_limit("auth.refresh.ip")
