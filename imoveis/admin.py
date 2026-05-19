from django.contrib import admin
from django.utils.html import format_html

from .models import Bairro, Cidade, Corretor, FavoritoImovel, ImagemImovel, Imovel, PontoInteresse, TipoImovel, log


@admin.register(TipoImovel)
class TipoImovelAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    search_fields = ("nome",)


@admin.register(Cidade)
class CidadeAdmin(admin.ModelAdmin):
    list_display = ("nome", "estado", "codigo_ibge", "latitude", "longitude", "pontos_sincronizados_em")
    list_filter = ("estado",)
    search_fields = ("nome", "estado", "codigo_ibge")


@admin.register(Bairro)
class BairroAdmin(admin.ModelAdmin):
    list_display = ("nome", "cidade")
    list_filter = ("cidade",)
    search_fields = ("nome", "cidade__nome")
    autocomplete_fields = ("cidade",)


@admin.register(Corretor)
class CorretorAdmin(admin.ModelAdmin):
    list_display = ("nome", "telefone", "whatsapp", "email", "creci", "ativo", "foto_preview")
    list_filter = ("ativo",)
    search_fields = ("nome", "email", "creci")

    def foto_preview(self, obj):
        if obj.foto:
            return format_html(
                '<img src="{}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">',
                obj.foto.url,
            )
        return "-"

    foto_preview.short_description = "Foto"


class ImagemImovelInline(admin.TabularInline):
    model = ImagemImovel
    extra = 3
    fields = ("imagem", "legenda", "principal", "ordem", "preview")
    readonly_fields = ("preview",)

    def preview(self, obj):
        if obj.imagem:
            return format_html(
                '<img src="{}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;">',
                obj.imagem.url,
            )
        return "-"

    preview.short_description = "Preview"


@admin.register(Imovel)
class ImovelAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "tipo",
        "cidade",
        "bairro",
        "preco_formatado_admin",
        "quartos",
        "area",
        "status",
        "destaque",
        "corretor",
        "criado_em",
    )
    list_filter = ("status", "destaque", "tipo", "cidade", "bairro", "corretor")
    search_fields = ("titulo", "descricao", "endereco", "cidade__nome", "bairro__nome")
    list_editable = ("status", "destaque")
    list_per_page = 20
    date_hierarchy = "criado_em"
    autocomplete_fields = ("cidade", "bairro", "tipo", "corretor")
    inlines = [ImagemImovelInline]

    fieldsets = (
        ("Informacoes Basicas", {"fields": ("titulo", "descricao", "tipo", "finalidade", "status", "destaque", "corretor")}),
        ("Localizacao", {"fields": ("cep", "endereco", "cidade", "bairro", "latitude", "longitude"), "classes": ("collapse",)}),
        ("Caracteristicas", {"fields": ("preco", "area", "quartos", "banheiros", "vagas", "zona_uso", "topografia")}),
    )

    def preco_formatado_admin(self, obj):
        return obj.preco_formatado

    preco_formatado_admin.short_description = "Preco"
    preco_formatado_admin.admin_order_field = "preco"


@admin.register(FavoritoImovel)
class FavoritoImovelAdmin(admin.ModelAdmin):
    list_display = ("usuario", "imovel", "criado_em")
    search_fields = ("usuario__username", "usuario__email", "imovel__titulo")
    autocomplete_fields = ("usuario", "imovel")
    date_hierarchy = "criado_em"


@admin.register(PontoInteresse)
class PontoInteresseAdmin(admin.ModelAdmin):
    list_display = ("nome", "categoria", "cidade", "latitude", "longitude", "atualizado_em")
    list_filter = ("categoria", "cidade")
    search_fields = ("nome", "cidade__nome", "osm_id")
    autocomplete_fields = ("cidade",)


@admin.register(log)
class LogAdmin(admin.ModelAdmin):
    list_display = ("route", "criado_em")
    search_fields = ("route", "erro")
    date_hierarchy = "criado_em"
    readonly_fields = ("route", "erro", "criado_em")
