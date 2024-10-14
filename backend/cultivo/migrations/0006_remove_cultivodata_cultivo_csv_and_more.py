# Generated by Django 4.2 on 2024-10-04 17:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cultivo', '0005_cultivocsv_cultivodata'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='cultivodata',
            name='cultivo_csv',
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='anch_fja',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='cuenta_area',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='curso',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='desviacion_y',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='distancia',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='duracion',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='elevacion',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='flj_cultivos_m',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='flj_cultivos_v',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='humedad',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='humedad_2',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='id_obj',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='masa_rend_humedo',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='masa_rend_seco',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='num_paso',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='prod',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='temp_aire',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='temp_suelo',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='vel_viento',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='velocidad',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='vol_rend_humedo',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='cultivodata',
            name='vol_rend_seco',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.DeleteModel(
            name='CultivoCSV',
        ),
    ]