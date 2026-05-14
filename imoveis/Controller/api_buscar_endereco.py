import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from .base_controller import BaseController
from .extract_data_request import extract_request_data
from django.http import HttpRequest
from rest_framework import status

class NominatimSearch(BaseController):

    BASE_URL = "https://nominatim.openstreetmap.org/search"
    limit: int = 5
    countrycodes: str = "br"
    UserAgent:str ="DashboardImoveis/1.0"

    def __init__(self):
        super().__init__()
        self.response2:list[dict] = []


    def search(
        self,
        request:HttpRequest
    
    ) -> bool:

        try:
            
            data =  extract_request_data(request)
            query =  data.get('query') or request.GET.get('query', '')

            if not query:
                return self.error(
                    "Informe uma query para consultar endereços.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Informe uma query para consultar endereços."},
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
                    "place_id": item.get("place_id"),
                    "type": item.get("type"),
                    "address": item.get("address", {})
                }
                for item in data
            ]

            return self.success(
                {
                    "success": True,
                    "provider": "nominatim",
                    "results": self.response2,
                },
                status.HTTP_200_OK,
            )

        except Exception as error:
            self.status = status.HTTP_500_INTERNAL_SERVER_ERROR
            self.strErr = 'Erro ao extrair endereços: ' +  str(error)
            self.response = {"success": False, "message": self.strErr}
            return False
