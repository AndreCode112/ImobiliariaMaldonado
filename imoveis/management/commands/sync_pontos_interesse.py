from time import sleep

from django.core.management.base import BaseCommand

from imoveis.Controller.sync_pontos_interesse import sync_pontos_interesse_cidade
from imoveis.models import Cidade, Imovel


class Command(BaseCommand):
    help = "Sincroniza pontos de interesse para cidades com imóveis cadastrados."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Refaz a consulta mesmo para cidades que ja foram sincronizadas.",
        )
        parser.add_argument(
            "--cidade-id",
            type=int,
            help="Sincroniza apenas uma cidade especifica.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Limita a quantidade de cidades processadas nesta execucao.",
        )
        parser.add_argument(
            "--radius",
            type=int,
            default=5000,
            help="Raio de busca em metros para cada origem.",
        )
        parser.add_argument(
            "--poi-limit",
            type=int,
            default=500,
            help="Quantidade maxima de pontos consultados por cidade.",
        )
        parser.add_argument(
            "--sleep",
            type=float,
            default=1.0,
            help="Pausa em segundos entre cidades para respeitar as APIs publicas.",
        )

    def handle(self, *args, **options):
        city_ids = (
            Imovel.objects.exclude(cidade__isnull=True)
            .exclude(latitude__isnull=True)
            .exclude(longitude__isnull=True)
            .values_list("cidade_id", flat=True)
            .distinct()
        )
        qs = Cidade.objects.filter(pk__in=city_ids).order_by("nome", "estado")

        if options["cidade_id"]:
            qs = qs.filter(pk=options["cidade_id"])
        elif not options["force"]:
            qs = qs.filter(pontos_sincronizados_em__isnull=True)

        if options["limit"]:
            qs = qs[: options["limit"]]

        total = qs.count() if hasattr(qs, "count") else len(qs)
        if not total:
            cidades_com_imoveis = Cidade.objects.filter(pk__in=city_ids).count()
            cidades_marcadas = Cidade.objects.filter(pk__in=city_ids, pontos_sincronizados_em__isnull=False).count()
            if cidades_com_imoveis and cidades_marcadas:
                self.stdout.write(
                    self.style.WARNING(
                        "Nenhuma cidade pendente para sincronizar. "
                        "As cidades com imoveis ja foram marcadas como sincronizadas; "
                        "use --force para repopular os pontos com as APIs configuradas no .env."
                    )
                )
                return
            self.stdout.write(self.style.SUCCESS("Nenhuma cidade com imoveis e coordenadas para sincronizar."))
            return

        synced_cities = 0
        synced_points = 0
        for index, cidade in enumerate(qs, start=1):
            self.stdout.write(f"[{index}/{total}] Sincronizando {cidade.nome} - {cidade.estado}...")
            count = sync_pontos_interesse_cidade(
                cidade,
                force=options["force"],
                radius=options["radius"],
                limit=options["poi_limit"],
            )
            synced_cities += 1
            synced_points += count
            self.stdout.write(self.style.SUCCESS(f"  {count} pontos salvos/atualizados."))
            if index < total and options["sleep"] > 0:
                sleep(options["sleep"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Concluido: {synced_cities} cidade(s), {synced_points} ponto(s) salvos/atualizados."
            )
        )
