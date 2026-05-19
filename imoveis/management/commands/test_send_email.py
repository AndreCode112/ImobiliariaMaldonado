from django.conf import settings
from django.core.mail import get_connection
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Envia um e-mail simples para testar as configuracoes de e-mail do Django."

    def add_arguments(self, parser):
        parser.add_argument(
            "to_email",
            help="E-mail de destino para o teste.",
        )

    def handle(self, *args, **options):
        to_email = options["to_email"]

        self.stdout.write("Iniciando teste de e-mail do Django...")
        self.stdout.write(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', False)}")
        self.stdout.write(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"EMAIL_TIMEOUT: {getattr(settings, 'EMAIL_TIMEOUT', None)}")
        self.stdout.write(f"Destino: {to_email}")

        try:
            self.stdout.write("Abrindo conexao SMTP...")
            connection = get_connection(fail_silently=False)
            connection.open()
            self.stdout.write(self.style.SUCCESS("Conexao SMTP aberta com sucesso."))

            self.stdout.write("Enviando mensagem de teste...")
            enviados = send_mail(
                subject="Teste de e-mail Django",
                message="Se voce recebeu este e-mail, o sender padrao do Django esta funcionando.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
                connection=connection,
            )
            connection.close()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Erro ao enviar e-mail: {type(exc).__name__}: {exc}"))
            raise CommandError("Falha no teste de e-mail. Veja os logs acima.") from exc

        if enviados:
            self.stdout.write(self.style.SUCCESS(f"E-mail de teste enviado para {to_email}."))
        else:
            self.stdout.write(self.style.WARNING("Nenhum e-mail foi enviado."))
