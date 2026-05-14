import json
from urllib.error import HTTPError, URLError
from django.http import HttpRequest
from rest_framework import status
from urllib.request import urlopen

from .base_controller import BaseController
from .extract_data_request import extract_request_data


class ApiBuscarCep(BaseController):
    def __init__(self):
        super().__init__()
        self.base_url = 'https://viacep.com.br/ws'

    def execute(self, request_or_cep: HttpRequest | str) -> bool:
        try:
            if isinstance(request_or_cep, HttpRequest) or hasattr(request_or_cep, "data"):
                data = extract_request_data(request_or_cep)
                cep: str = data.get('cep', '')
            else:
                cep = str(request_or_cep or "")
            
            if not cep:
                return self.error(
                    "Campo Cep obrigatorio na requisiçao",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Campo Cep obrigatorio na requisiçao"},
                )
            
            cep_numerico = "".join(filter(str.isdigit, cep or ""))
            if len(cep_numerico) != 8:
                return self.error(
                    "Informe um CEP com 8 dígitos.",
                    status.HTTP_400_BAD_REQUEST,
                    {"success": False, "message": "Informe um CEP com 8 dígitos."},
                )

            with urlopen(f"{self.base_url}/{cep_numerico}/json/", timeout=10) as resposta:
                payload = json.loads(resposta.read().decode("utf-8"))

            if payload.get("erro"):
                return self.error(
                    "CEP não encontrado.",
                    status.HTTP_404_NOT_FOUND,
                    {"success": False, "message": "CEP não encontrado."},
                )

            return self.success(
                {
                    "success": True,
                    "data": {
                        "cep": payload.get("cep", ""),
                        "logradouro": payload.get("logradouro", ""),
                        "complemento": payload.get("complemento", ""),
                        "bairro": payload.get("bairro", ""),
                        "localidade": payload.get("localidade", ""),
                        "cidade": payload.get("localidade", ""),
                        "uf": payload.get("uf", ""),
                        "estado": payload.get("estado", ""),
                        "ibge": payload.get("ibge", ""),
                    },
                },
                status.HTTP_200_OK,
            )
        except HTTPError as e:
            return self.error(
                f"Falha ao consultar o CEP. HTTP {e.code}.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": f"Falha ao consultar o CEP. HTTP {e.code}."},
            )
        except URLError:
            return self.error(
                "Não foi possível consultar o serviço de CEP no momento.",
                status.HTTP_502_BAD_GATEWAY,
                {"success": False, "message": "Não foi possível consultar o serviço de CEP no momento."},
            )
        except Exception as e:
            return self.error(
                "Erro ao consultar o CEP: " + str(e),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                {"success": False, "message": "Erro ao consultar o CEP: " + str(e)},
            )
