# Generated by Django 4.2 on 2024-10-09 00:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cultivo', '0007_remove_cultivodata_conjunto_datos_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='cultivodata',
            name='prod',
        ),
        migrations.AddField(
            model_name='cultivodata',
            name='rendimiento_real',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='cultivodata',
            name='rendimiento_relativo',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
