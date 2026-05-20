from django.conf import settings


class ContentSecurityPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not response.has_header("Content-Security-Policy"):
            response["Content-Security-Policy"] = settings.CONTENT_SECURITY_POLICY
        return response
