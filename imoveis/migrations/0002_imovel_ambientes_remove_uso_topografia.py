from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="imovel",
            name="cozinhas",
            field=models.PositiveIntegerField(default=0, verbose_name="Cozinhas"),
        ),
        migrations.AddField(
            model_name="imovel",
            name="salas",
            field=models.PositiveIntegerField(default=0, verbose_name="Salas"),
        ),
        migrations.AddField(
            model_name="imovel",
            name="varandas",
            field=models.PositiveIntegerField(default=0, verbose_name="Varandas"),
        ),
        migrations.RemoveField(
            model_name="imovel",
            name="topografia",
        ),
        migrations.RemoveField(
            model_name="imovel",
            name="zona_uso",
        ),
    ]
