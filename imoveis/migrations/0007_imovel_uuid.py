# Generated manually on 2026-05-19

import uuid

from django.db import migrations, models


def populate_imovel_uuid(apps, schema_editor):
    Imovel = apps.get_model("imoveis", "Imovel")
    for imovel in Imovel.objects.filter(uuid__isnull=True):
        imovel.uuid = uuid.uuid4()
        imovel.save(update_fields=["uuid"])


class Migration(migrations.Migration):

    dependencies = [
        ("imoveis", "0006_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="imovel",
            name="uuid",
            field=models.UUIDField(blank=True, db_index=True, editable=False, null=True),
        ),
        migrations.RunPython(populate_imovel_uuid, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="imovel",
            name="uuid",
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True, verbose_name="UUID publico"),
        ),
    ]
