# Generated by Django 2.1.1 on 2018-09-17 21:16

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_merge_20180917_2029'),
    ]

    operations = [
        migrations.AlterField(
            model_name='version',
            name='label',
            field=models.CharField(
                max_length=1024,
                validators=[
                    django.core.validators.RegexValidator(
                        regex='^[a-zA-Z0-9._+-]+$',
                    ),
                ],
            ),
        ),
    ]
