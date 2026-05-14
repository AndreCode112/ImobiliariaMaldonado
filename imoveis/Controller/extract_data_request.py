from rest_framework.exceptions import UnsupportedMediaType
from django.http import HttpRequest
import json

def extract_request_data(request: HttpRequest) -> dict:
    try:
        data = request.data
        if isinstance(data, dict):
            return data
        return dict(data)
    except UnsupportedMediaType:
        pass
    except Exception:
        pass
    try:
        body = request.body.decode("utf-8").strip()
        if body:
            parsed_body = json.loads(body)
            if isinstance(parsed_body, dict):
                return parsed_body
    except Exception:
        pass

    return {}