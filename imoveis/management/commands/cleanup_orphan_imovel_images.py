from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from imoveis.models import ImagemImovel


class Command(BaseCommand):
    help = "Lista ou remove arquivos em media/imoveis que não possuem registro em ImagemImovel."

    def add_arguments(self, parser):
        parser.add_argument("--delete", action="store_true", help="Remove os arquivos órfãos encontrados.")

    def handle(self, *args, **options):
        images_dir = Path(settings.MEDIA_ROOT) / "imoveis"
        if not images_dir.exists():
            self.stdout.write("Diretório media/imoveis não existe.")
            return

        referenced = set(
            ImagemImovel.objects.exclude(imagem="")
            .values_list("imagem", flat=True)
        )
        files = [path for path in images_dir.rglob("*") if path.is_file()]
        orphan_files = [
            path for path in files
            if path.relative_to(settings.MEDIA_ROOT).as_posix() not in referenced
        ]

        if not orphan_files:
            self.stdout.write(self.style.SUCCESS("Nenhuma imagem órfã encontrada."))
            return

        delete = options["delete"]
        for path in orphan_files:
            relative = path.relative_to(settings.MEDIA_ROOT).as_posix()
            if delete:
                path.unlink(missing_ok=True)
                self.stdout.write(f"Removida: {relative}")
            else:
                self.stdout.write(f"Órfã: {relative}")

        action = "removidas" if delete else "encontradas"
        self.stdout.write(self.style.SUCCESS(f"{len(orphan_files)} imagens órfãs {action}."))
