# Generated by Django 2.1.1 on 2018-09-11 19:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_job_enqueued_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='job_id',
            field=models.UUIDField(null=True),
        ),
    ]
