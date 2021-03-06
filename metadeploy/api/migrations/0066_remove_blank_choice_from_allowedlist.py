# Generated by Django 2.2 on 2019-04-12 18:05

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("api", "0065_allowedlist_org_type")]

    operations = [
        migrations.AlterField(
            model_name="allowedlist",
            name="org_type",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    blank=True,
                    choices=[
                        ("Production", "Production"),
                        ("Scratch", "Scratch"),
                        ("Sandbox", "Sandbox"),
                        ("Developer", "Developer"),
                    ],
                    max_length=64,
                ),
                default=list,
                size=4,
            ),
        )
    ]
