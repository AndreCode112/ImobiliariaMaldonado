from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0004_alter_lembretefavoritosconfig_horario"),
    ]

    operations = [
        migrations.AddField(
            model_name="lembretefavoritosconfig",
            name="whatsapp_destino",
            field=models.CharField(
                choices=[("corretor", "Corretor selecionado"), ("manual", "Numero manual")],
                default="corretor",
                max_length=20,
                verbose_name="Destino do WhatsApp",
            ),
        ),
        migrations.AddField(
            model_name="lembretefavoritosconfig",
            name="whatsapp_corretor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="imoveis.corretor",
                verbose_name="Corretor do WhatsApp",
            ),
        ),
        migrations.AddField(
            model_name="lembretefavoritosconfig",
            name="whatsapp_numero_manual",
            field=models.CharField(blank=True, max_length=30, verbose_name="Numero manual do WhatsApp"),
        ),
    ]
