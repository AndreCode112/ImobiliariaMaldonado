from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0002_imovel_ambientes_remove_uso_topografia"),
    ]

    operations = [
        migrations.AddField(
            model_name="imovel",
            name="regiao",
            field=models.CharField(
                choices=[("urbano", "Urbano"), ("rural", "Rural")],
                default="urbano",
                max_length=20,
                verbose_name="Regiao",
            ),
        ),
        migrations.AddField(
            model_name="imovel",
            name="alqueres",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name="Alqueres"),
        ),
        migrations.AddField(
            model_name="imovel",
            name="casas",
            field=models.PositiveIntegerField(default=0, verbose_name="Casas no terreno"),
        ),
    ]
