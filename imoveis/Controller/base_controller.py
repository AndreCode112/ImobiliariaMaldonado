
from rest_framework import status

class BaseController:
    def __init__(self):
        self.strErr: str = ""
        self.status: int = status.HTTP_500_INTERNAL_SERVER_ERROR
        self.response: dict = {}
        

    def success(self, response: dict | None = None, http_status: int = status.HTTP_200_OK) -> bool:
        self.response = response or {}
        self.status = http_status
        self.strErr = ""
        return True

    def error(
        self,
        message: str,
        http_status: int = status.HTTP_400_BAD_REQUEST,
        response: dict | None = None,
    ) -> bool:
        self.strErr = message
        self.status = http_status
        self.response = response or {}
        return False
