from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0003_imovel_regiao_rural"),
    ]

    operations = [
        migrations.AddField(
            model_name="imovel",
            name="hectares",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name="Hectares"),
        ),
    ]
