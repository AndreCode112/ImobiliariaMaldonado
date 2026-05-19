import os
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import get_connection
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Prefetch, Q

from imoveis.Controller.sendEmail import EmailSender
from imoveis.models import FavoritoImovel, ImagemImovel, Imovel, LembreteFavoritosConfig


class Command(BaseCommand):
    help = "Envia um lembrete diario com os imoveis favoritados de cada usuario."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra quem receberia o lembrete sem enviar e-mail.",
        )
        parser.add_argument(
            "--user-id",
            type=int,
            help="Envia apenas para um usuario especifico.",
        )
        parser.add_argument(
            "--limit-users",
            type=int,
            help="Limita a quantidade de usuarios processados.",
        )
        parser.add_argument(
            "--max-imoveis",
            type=int,
            default=8,
            help="Quantidade maxima de imoveis por e-mail.",
        )
        parser.add_argument(
            "--to-email",
            default="andrecr7r102014@gmail.com",
            help="E-mail que recebera os lembretes. Por padrao envia para o e-mail de teste.",
        )

    def handle(self, *args, **options):
        usuarios = self._usuarios_com_favoritos(options)
        total = usuarios.count() if hasattr(usuarios, "count") else len(usuarios)

        if not total:
            self.stdout.write(self.style.WARNING("Nenhum usuario com favoritos disponiveis para lembrar."))
            return

        sender = EmailSender.from_env()
        config = LembreteFavoritosConfig.get_solo()
        to_email = options["to_email"]
        connection = None
        enviados = 0
        ignorados = 0

        try:
            if not options["dry_run"]:
                self._print_email_settings()
                self.stdout.write(f"Destino padrao dos lembretes: {to_email}")
                self.stdout.write("Abrindo conexao SMTP...")
                connection = get_connection(fail_silently=False)
                connection.open()
                self.stdout.write(self.style.SUCCESS("Conexao SMTP aberta com sucesso."))

            for usuario in usuarios:
                favoritos = list(usuario.favoritos_disponiveis[: options["max_imoveis"]])
                if not favoritos:
                    ignorados += 1
                    continue

                imoveis = [self._imovel_context(favorito.imovel, config) for favorito in favoritos]
                inline_images = self._inline_images(imoveis)
                imagem_src = imoveis[0]["imagem_src"] if imoveis else ""
                subject = "Seus imóveis favoritos ainda estão disponíveis"
                html = sender.render_template(
                    "imoveis/imovel_favorito_user.html",
                    {
                        "logo_src": "cid:logo_maldonado",
                        "icons": self._icon_sources(),
                        "usuario_nome": usuario.get_full_name() or usuario.get_username(),
                        "imoveis": imoveis,
                    },
                )
                text = self._plain_text(usuario, imoveis)

                if options["dry_run"]:
                    self.stdout.write(
                        f"[dry-run] {to_email}: {len(imoveis)} imovel(is) favorito(s) no lembrete do usuario {usuario.email}."
                    )
                    if imagem_src:
                        self.stdout.write(f"[dry-run] Imagem do e-mail: {imagem_src}")
                    enviados += 1
                    continue

                self.stdout.write(f"Enviando lembrete para {to_email} referente ao usuario {usuario.email}...")
                if imagem_src:
                    self.stdout.write(f"Imagem do e-mail: {imagem_src}")
                if sender.send_email(
                    to_email,
                    subject,
                    html,
                    text_body=text,
                    inline_images=inline_images,
                    connection=connection,
                ):
                    enviados += 1
                    self.stdout.write(self.style.SUCCESS(f"SMTP aceitou o e-mail para {to_email}."))
                else:
                    ignorados += 1
                    self.stdout.write(self.style.ERROR(f"O backend SMTP nao confirmou envio para {to_email}."))
        except Exception as exc:
            raise CommandError(f"Erro ao enviar lembretes: {type(exc).__name__}: {exc}") from exc
        finally:
            if connection:
                connection.close()

        self.stdout.write(self.style.SUCCESS(f"Concluido: {enviados} enviado(s), {ignorados} ignorado(s)."))

    def _print_email_settings(self):
        self.stdout.write("Configuracoes de e-mail do Django:")
        self.stdout.write(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', False)}")
        self.stdout.write(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"EMAIL_TIMEOUT: {getattr(settings, 'EMAIL_TIMEOUT', None)}")

    def _usuarios_com_favoritos(self, options):
        User = get_user_model()
        favoritos_qs = (
            FavoritoImovel.objects.filter(imovel__status="disponivel")
            .select_related("imovel", "imovel__cidade", "imovel__bairro", "imovel__corretor")
            .prefetch_related(
                Prefetch(
                    "imovel__imagens",
                    queryset=ImagemImovel.objects.order_by("-principal", "ordem"),
                )
            )
            .order_by("-criado_em")
        )

        usuarios = (
            User.objects.filter(is_active=True)
            .exclude(email="")
            .annotate(
                total_favoritos=Count(
                    "imoveis_favoritos",
                    filter=Q(imoveis_favoritos__imovel__status="disponivel"),
                )
            )
            .filter(total_favoritos__gt=0)
            .prefetch_related(Prefetch("imoveis_favoritos", queryset=favoritos_qs, to_attr="favoritos_disponiveis"))
            .order_by("id")
        )

        if options["user_id"]:
            usuarios = usuarios.filter(pk=options["user_id"])
        if options["limit_users"]:
            usuarios = usuarios[: options["limit_users"]]
        return usuarios

    def _imovel_context(self, imovel: Imovel, config: LembreteFavoritosConfig | None = None) -> dict:
        imovel_url = self._build_imovel_url(imovel.pk)
        whatsapp_link = self._build_whatsapp_link(imovel, imovel_url, config or LembreteFavoritosConfig.get_solo())
        imagem = imovel.imagens.first()
        imagem_cid = f"imovel_{imovel.pk}_principal"

        return {
            "titulo": imovel.titulo,
            "endereco": self._format_endereco(imovel),
            "preco": imovel.preco_formatado,
            "quartos": imovel.quartos,
            "banheiros": imovel.banheiros,
            "vagas": imovel.vagas,
            "area": imovel.area,
            "descricao": self._resumo(imovel.descricao),
            "imagem_src": f"cid:{imagem_cid}" if imagem and imagem.imagem else "",
            "imagem_cid": imagem_cid if imagem and imagem.imagem else "",
            "imagem_path": self._image_path(imagem.imagem) if imagem and imagem.imagem else "",
            "imovel_url": imovel_url,
            "whatsapp_link": whatsapp_link,
        }

    def _build_imovel_url(self, imovel_id: int) -> str:
        base_url = self._public_base_url("FRONTEND_BASE_URL", "SITE_URL")
        return f"{base_url.rstrip('/')}/imoveis/{imovel_id}"

    def _public_base_url(self, *names: str) -> str:
        base_url = self._setting_or_env(*names)
        if base_url and "localhost" not in base_url and "127.0.0.1" not in base_url:
            return base_url

        email_domain = settings.EMAIL_HOST_USER.split("@")[-1]
        return f"https://{email_domain}"

    def _image_path(self, image_file) -> str:
        try:
            return image_file.path
        except (NotImplementedError, ValueError):
            return ""

    def _inline_images(self, imoveis: list[dict]) -> list[dict]:
        images = []
        logo_path = settings.BASE_DIR / "media" / "logo" / "logo.png"
        if logo_path.exists():
            images.append({"cid": "logo_maldonado", "path": str(logo_path)})

        for icon in self._icon_files().values():
            if icon["path"].exists():
                images.append({"cid": icon["cid"], "path": str(icon["path"])})

        for item in imoveis:
            image_path = item.get("imagem_path")
            image_cid = item.get("imagem_cid")
            if image_path and image_cid and os.path.exists(image_path):
                images.append({"cid": image_cid, "path": image_path})

        return images

    def _icon_sources(self) -> dict:
        return {name: f"cid:{icon['cid']}" for name, icon in self._icon_files().items()}

    def _icon_files(self) -> dict:
        icons_dir = settings.BASE_DIR / "media" / "icons"
        return {
            "quarto": {
                "cid": "quarto_png",
                "path": icons_dir / "quarto.png",
            },
            "banheiro": {
                "cid": "banheiro_png",
                "path": icons_dir / "banheiro.png",
            },
            "estacionamento": {
                "cid": "estacionamento_png",
                "path": icons_dir / "estacionamento.png",
            },
            "tamanho_da_casa": {
                "cid": "tamanho_da_casa_png",
                "path": icons_dir / "tamanho_da_casa.png",
            },
            "favorito": {
                "cid": "favorito_png",
                "path": icons_dir / "favorito.png",
            },
            "whatsapp": {
                "cid": "whatsApp_png",
                "path": icons_dir / "whatsApp.png",
            },
        }

    def _build_whatsapp_link(self, imovel: Imovel, imovel_url: str, config: LembreteFavoritosConfig) -> str:
        numero = self._whatsapp_number_from_config(config)
        if not numero:
            if imovel.corretor and (imovel.corretor.whatsapp or imovel.corretor.telefone):
                numero = "".join(filter(str.isdigit, imovel.corretor.whatsapp or imovel.corretor.telefone))
        if not numero:
            numero = "".join(filter(str.isdigit, self._setting_or_env("WHATSAPP_NUMBER", "DEFAULT_WHATSAPP", default="")))

        mensagem = config.whatsapp_mensagem.format(
            titulo=imovel.titulo,
            url=imovel_url,
            preco=imovel.preco_formatado,
            endereco=self._format_endereco(imovel),
        )
        return f"https://wa.me/{numero}?text={quote(mensagem)}" if numero else f"https://wa.me/?text={quote(mensagem)}"

    def _whatsapp_number_from_config(self, config: LembreteFavoritosConfig) -> str:
        if config.whatsapp_destino == "manual":
            return "".join(filter(str.isdigit, config.whatsapp_numero_manual or ""))

        corretor = config.whatsapp_corretor
        if corretor and (corretor.whatsapp or corretor.telefone):
            return "".join(filter(str.isdigit, corretor.whatsapp or corretor.telefone))

        return ""

    def _format_endereco(self, imovel: Imovel) -> str:
        partes = [imovel.endereco]
        if imovel.bairro:
            partes.append(imovel.bairro.nome)
        if imovel.cidade:
            partes.append(str(imovel.cidade))
        return " - ".join([parte for parte in partes if parte])

    def _resumo(self, texto: str, limite: int = 180) -> str:
        texto = " ".join((texto or "").split())
        if len(texto) <= limite:
            return texto
        return texto[: limite - 3].rstrip() + "..."

    def _plain_text(self, usuario, imoveis: list[dict]) -> str:
        nome = usuario.get_full_name() or usuario.get_username()
        linhas = [
            f"Ola, {nome}!",
            "",
            "Seus imoveis favoritos ainda estao disponiveis.",
            "",
        ]

        for item in imoveis:
            linhas.extend(
                [
                    item["titulo"],
                    item["endereco"],
                    item["preco"],
                    item["imovel_url"],
                    "",
                ]
            )

        linhas.append("Maldonado Imoveis")
        return "\n".join(linhas)

    def _setting_or_env(self, *names: str, default: str = "") -> str:
        for name in names:
            value = getattr(settings, name, None) or os.getenv(name)
            if value:
                return str(value)
        return default
