import uuid as uuid_lib
from datetime import time
from pyexpat import model

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils import timezone




class log(models.Model):
    criado_em = models.DateTimeField("Criado em", auto_now_add=True)
    route = models.CharField(max_length=200, blank=True, null=False)
    erro = models.TextField()

    def __str__(self):
        return f"{self.route} - {self.criado_em:%d/%m/%Y %H:%M}" if self.criado_em else self.route


class TipoImovel(models.Model):
    nome = models.CharField("Tipo", max_length=100)

    class Meta:
        verbose_name = "Tipo de Imovel"
        verbose_name_plural = "Tipos de Imovel"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Cidade(models.Model):
    nome = models.CharField("Nome", max_length=100)
    estado = models.CharField("Estado (UF)", max_length=2)
    codigo_ibge = models.CharField("Codigo IBGE", max_length=20, blank=True)
    latitude = models.DecimalField("Latitude", max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField("Longitude", max_digits=10, decimal_places=7, null=True, blank=True)
    pontos_sincronizados_em = models.DateTimeField("Pontos sincronizados em", null=True, blank=True)

    class Meta:
        verbose_name = "Cidade"
        verbose_name_plural = "Cidades"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} - {self.estado}"

    @property
    def pontos_sincronizados(self):
        return self.pontos_sincronizados_em is not None

    def marcar_pontos_sincronizados(self):
        self.pontos_sincronizados_em = timezone.now()
        self.save(update_fields=["pontos_sincronizados_em"])


class PontoInteresse(models.Model):
    CATEGORIA_CHOICES = [
        ("restaurante", "Restaurante"),
        ("mercado", "Mercado"),
        ("loja", "Loja"),
        ("turismo", "Turismo"),
        ("parque", "Parque"),
        ("servico", "Servico"),
    ]

    cidade = models.ForeignKey(Cidade, on_delete=models.CASCADE, related_name="pontos_interesse")
    osm_type = models.CharField("Tipo OSM", max_length=20)
    osm_id = models.CharField("ID OSM", max_length=40)
    nome = models.CharField("Nome", max_length=200)
    categoria = models.CharField("Categoria", max_length=30, choices=CATEGORIA_CHOICES)
    latitude = models.DecimalField("Latitude", max_digits=10, decimal_places=7)
    longitude = models.DecimalField("Longitude", max_digits=10, decimal_places=7)
    tags = models.JSONField("Tags", default=dict, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ponto de Interesse"
        verbose_name_plural = "Pontos de Interesse"
        unique_together = ("cidade", "osm_type", "osm_id")
        ordering = ["categoria", "nome"]

    def __str__(self):
        return f"{self.nome} ({self.get_categoria_display()})"

    def to_map_dict(self):
        return {
            "id": self.pk,
            "nome": self.nome,
            "categoria": self.categoria,
            "categoria_label": self.get_categoria_display(),
            "lat": float(self.latitude),
            "lng": float(self.longitude),
        }


class Bairro(models.Model):
    cidade = models.ForeignKey(Cidade, on_delete=models.CASCADE, related_name="bairros", verbose_name="Cidade")
    nome = models.CharField("Nome", max_length=100)

    class Meta:
        verbose_name = "Bairro"
        verbose_name_plural = "Bairros"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} - {self.cidade.nome}"


class Corretor(models.Model):
    nome = models.CharField("Nome completo", max_length=200)
    telefone = models.CharField("Telefone", max_length=20)
    whatsapp = models.CharField("WhatsApp", max_length=20, help_text="Ex: 5511999999999")
    email = models.EmailField("E-mail")
    creci = models.CharField("CRECI", max_length=50, blank=True)
    foto = models.ImageField("Foto", upload_to="corretores/", blank=True, null=True)
    ativo = models.BooleanField("Ativo", default=True)

    class Meta:
        verbose_name = "Corretor"
        verbose_name_plural = "Corretores"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    @property
    def whatsapp_link(self):
        numero = "".join(filter(str.isdigit, self.whatsapp))
        return f"https://wa.me/{numero}"


class Imovel(models.Model):
    STATUS_CHOICES = [
        ("disponivel", "Disponivel"),
        ("vendido", "Vendido"),
        ("alugado", "Alugado"),
        ("reservado", "Reservado"),
    ]

    FINALIDADE_CHOICES = [
        ("residencial", "Residencial"),
        ("comercial", "Comercial"),
        ("misto", "Misto"),
        ("industrial", "Industrial"),
    ]

    uuid = models.UUIDField("UUID publico", default=uuid_lib.uuid4, unique=True, editable=False, db_index=True)
    titulo = models.CharField("Titulo", max_length=200)
    descricao = models.TextField("Descricao")
    preco = models.DecimalField("Preco (R$)", max_digits=14, decimal_places=2)
    cep = models.CharField("CEP", max_length=9, blank=True)
    cidade = models.ForeignKey(Cidade, on_delete=models.SET_NULL, null=True, verbose_name="Cidade")
    bairro = models.ForeignKey(Bairro, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Bairro")
    endereco = models.CharField("Endereco completo", max_length=300)
    latitude = models.DecimalField("Latitude", max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField("Longitude", max_digits=10, decimal_places=7, null=True, blank=True)
    tipo = models.ForeignKey(TipoImovel, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Tipo")
    quartos = models.PositiveIntegerField("Quartos", default=0)
    banheiros = models.PositiveIntegerField("Banheiros", default=0)
    vagas = models.PositiveIntegerField("Vagas de garagem", default=0)
    cozinhas = models.PositiveIntegerField("Cozinhas", default=0)
    salas = models.PositiveIntegerField("Salas", default=0)
    varandas = models.PositiveIntegerField("Varandas", default=0)
    area = models.DecimalField("Area (m2)", max_digits=10, decimal_places=2)
    status = models.CharField("Status", max_length=20, choices=STATUS_CHOICES, default="disponivel")
    destaque = models.BooleanField("Imovel em destaque", default=False)
    corretor = models.ForeignKey(Corretor, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Corretor")
    finalidade = models.CharField("Finalidade", max_length=50, blank=True, choices=FINALIDADE_CHOICES)
    criado_em = models.DateTimeField("Criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Imovel"
        verbose_name_plural = "Imoveis"
        ordering = ["-destaque", "-criado_em"]

    def __str__(self):
        return self.titulo

    def get_absolute_url(self):
        return reverse("ApiImovelUuidDetail", kwargs={"uuid": self.uuid})

    @property
    def imagem_principal(self):
        img = self.imagens.filter(principal=True).first()
        if not img:
            img = self.imagens.first()
        return img

    @property
    def preco_formatado(self):
        return f"R$ {self.preco:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    @property
    def preco_resumido(self):
        if self.preco >= 1_000_000:
            return f"R$ {self.preco / 1_000_000:.1f}M"
        if self.preco >= 1_000:
            return f"R$ {int(self.preco / 1_000)}K"
        return self.preco_formatado

    def to_map_dict(self):
        img = self.imagem_principal
        return {
            "id": self.pk,
            "uuid": str(self.uuid),
            "titulo": self.titulo,
            "preco": self.preco_formatado,
            "preco_resumido": self.preco_resumido,
            "endereco": self.endereco,
            "lat": float(self.latitude) if self.latitude is not None else None,
            "lng": float(self.longitude) if self.longitude is not None else None,
            "quartos": self.quartos,
            "banheiros": self.banheiros,
            "vagas": self.vagas,
            "cozinhas": self.cozinhas,
            "salas": self.salas,
            "varandas": self.varandas,
            "area": float(self.area),
            "tipo": self.tipo.nome if self.tipo else "",
            "finalidade": self.get_finalidade_display() if self.finalidade else "",
            "url": self.get_absolute_url(),
            "imagem": img.imagem.url if img and img.imagem else None,
            "imagens_count": self.imagens.count(),
            "destaque": self.destaque,
        }


class ImagemImovel(models.Model):
    imovel = models.ForeignKey(Imovel, on_delete=models.CASCADE, related_name="imagens", verbose_name="Imovel")
    imagem = models.ImageField("Imagem", upload_to="imoveis/")
    legenda = models.CharField("Legenda", max_length=200, blank=True)
    principal = models.BooleanField("Imagem principal", default=False)
    ordem = models.PositiveIntegerField("Ordem", default=0)

    class Meta:
        verbose_name = "Imagem do Imovel"
        verbose_name_plural = "Imagens do Imovel"
        ordering = ["-principal", "ordem"]

    def __str__(self):
        return f"Imagem de {self.imovel.titulo}"

    def save(self, *args, **kwargs):
        if self.principal:
            ImagemImovel.objects.filter(imovel=self.imovel, principal=True).exclude(pk=self.pk).update(principal=False)
        super().save(*args, **kwargs)


class FavoritoImovel(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="imoveis_favoritos")
    imovel = models.ForeignKey(Imovel, on_delete=models.CASCADE, related_name="favoritos")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Imovel Favorito"
        verbose_name_plural = "Imoveis Favoritos"
        unique_together = ("usuario", "imovel")
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.usuario} favoritou {self.imovel}"


class LembreteFavoritosConfig(models.Model):
    WHATSAPP_DESTINO_CHOICES = [
        ("corretor", "Corretor selecionado"),
        ("manual", "Numero manual"),
    ]

    whatsapp_mensagem = models.TextField(
        "Mensagem do WhatsApp",
        default="Ola, tenho interesse no imovel {titulo}: {url}",
        help_text="Variaveis disponiveis: {titulo}, {url}, {preco}, {endereco}.",
    )
    whatsapp_destino = models.CharField(
        "Destino do WhatsApp",
        max_length=20,
        choices=WHATSAPP_DESTINO_CHOICES,
        default="corretor",
    )
    whatsapp_corretor = models.ForeignKey(
        Corretor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Corretor do WhatsApp",
    )
    whatsapp_numero_manual = models.CharField("Numero manual do WhatsApp", max_length=30, blank=True)
    horario = models.TimeField("Horario de envio", default=time(9, 0))
    ativo = models.BooleanField("Agendamento ativo", default=False)
    cron_instalado = models.BooleanField("Cron instalado", default=False)
    cron_linha = models.TextField("Linha do cron", blank=True)
    ultima_atualizacao_cron = models.DateTimeField("Ultima atualizacao do cron", null=True, blank=True)
    atualizado_em = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Configuracao de Lembrete de Favoritos"
        verbose_name_plural = "Configuracoes de Lembretes de Favoritos"

    def __str__(self):
        status = "ativo" if self.ativo else "inativo"
        return f"Lembrete de favoritos {status} as {self.horario:%H:%M}"

    @classmethod
    def get_solo(cls):
        config, _created = cls.objects.get_or_create(pk=1)
        return config


class EnderecoBuscaCache(models.Model):
    provider = models.CharField("Provider", max_length=40, default="nominatim")
    query_original = models.CharField("Query original", max_length=220)
    query_normalizada = models.CharField("Query normalizada", max_length=220, db_index=True)
    cache_key = models.CharField("Cache key", max_length=64, db_index=True)
    result_index = models.PositiveSmallIntegerField("Ordem do resultado", default=0)
    display_name = models.CharField("Nome exibido", max_length=500)
    latitude = models.CharField("Latitude", max_length=40)
    longitude = models.CharField("Longitude", max_length=40)
    place_id = models.CharField("Place ID", max_length=80, blank=True)
    tipo = models.CharField("Tipo", max_length=80, blank=True)
    address = models.JSONField("Address", default=dict, blank=True)
    raw_response = models.JSONField("Resposta original", default=dict, blank=True)
    hits = models.PositiveIntegerField("Usos", default=0)
    ultimo_uso_em = models.DateTimeField("Último uso em", null=True, blank=True)
    expires_at = models.DateTimeField("Expira em", db_index=True)
    criado_em = models.DateTimeField("Criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Cache de Busca de Endereco"
        verbose_name_plural = "Caches de Busca de Endereco"
        ordering = ["cache_key", "result_index"]
        unique_together = ("provider", "cache_key", "result_index")

    def __str__(self):
        return f"{self.provider}: {self.query_normalizada}"

    def to_result_dict(self):
        return {
            "display_name": self.display_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "place_id": self.place_id,
            "type": self.tipo,
            "address": self.address or {},
        }
