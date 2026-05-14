import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from rest_framework import status

from .base_controller import BaseController


class ApiBuscarCoordenadas(BaseController):
    user_agent = "MaldonadoCorretagem/1.0"
    base_url = "https://nominatim.openstreetmap.org" 


    def execute(self, query: str, *, limit: int = 1) -> bool:
        try:
            query = (query or "").strip()
            if not query:
                return self.error(
                    "Informe um endereço para buscar coordenadas.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Informe um endereço para buscar coordenadas."},
                )

            url = f" {self.base_url}/search?" + urlencode(
                {
                    "q": query,
                    "format": "json",
                    "limit": max(1, limit),
                    "addressdetails": 1,
                    "countrycodes": "br",
                }
            )
            request = Request(url, headers={"User-Agent": self.user_agent})
            with urlopen(request, timeout=10) as resposta:
                payload = json.loads(resposta.read().decode("utf-8"))

            if not payload:
                return self.error(
                    "Coordenadas não encontradas para este endereço.",
                    status.HTTP_404_NOT_FOUND,
                    {"success": False, "message": "Coordenadas não encontradas para este endereço."},
                )

            item = payload[0]
            return self.success(
                {
                    "success": True,
                    "data": {
                        "latitude": item.get("lat", ""),
                        "longitude": item.get("lon", ""),
                        "display_name": item.get("display_name", ""),
                        "address": item.get("address") or {},
                        "class": item.get("class", ""),
                        "type": item.get("type", ""),
                        "addresstype": item.get("addresstype", ""),
                        "importance": item.get("importance"),
                    },
                },
                status.HTTP_200_OK,
            )
        except HTTPError as e:
            return self.error(
                f"Falha ao consultar coordenadas. HTTP {e.code}.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": f"Falha ao consultar coordenadas. HTTP {e.code}."},
            )
        except URLError:
            return self.error(
                "Não foi possível consultar o serviço de coordenadas no momento.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": "Não foi possível consultar o serviço de coordenadas no momento."},
            )
        except Exception as e:
            return self.error(
                "Erro ao consultar coordenadas: " + str(e),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                {"success": False, "message": "Erro ao consultar coordenadas: " + str(e)},
            )
