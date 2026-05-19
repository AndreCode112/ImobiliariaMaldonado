from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EnderecoBuscaCache",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(default="nominatim", max_length=40, verbose_name="Provider")),
                ("query_original", models.CharField(max_length=220, verbose_name="Query original")),
                ("query_normalizada", models.CharField(db_index=True, max_length=220, verbose_name="Query normalizada")),
                ("cache_key", models.CharField(db_index=True, max_length=64, verbose_name="Cache key")),
                ("result_index", models.PositiveSmallIntegerField(default=0, verbose_name="Ordem do resultado")),
                ("display_name", models.CharField(max_length=500, verbose_name="Nome exibido")),
                ("latitude", models.CharField(max_length=40, verbose_name="Latitude")),
                ("longitude", models.CharField(max_length=40, verbose_name="Longitude")),
                ("place_id", models.CharField(blank=True, max_length=80, verbose_name="Place ID")),
                ("tipo", models.CharField(blank=True, max_length=80, verbose_name="Tipo")),
                ("address", models.JSONField(blank=True, default=dict, verbose_name="Address")),
                ("raw_response", models.JSONField(blank=True, default=dict, verbose_name="Resposta original")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="Usos")),
                ("ultimo_uso_em", models.DateTimeField(blank=True, null=True, verbose_name="Último uso em")),
                ("expires_at", models.DateTimeField(db_index=True, verbose_name="Expira em")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("atualizado_em", models.DateTimeField(auto_now=True, verbose_name="Atualizado em")),
            ],
            options={
                "verbose_name": "Cache de Busca de Endereco",
                "verbose_name_plural": "Caches de Busca de Endereco",
                "ordering": ["cache_key", "result_index"],
                "unique_together": {("provider", "cache_key", "result_index")},
            },
        ),
    ]
