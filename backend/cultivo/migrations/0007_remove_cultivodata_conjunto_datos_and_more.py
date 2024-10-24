# Generated by Django 4.2 on 2024-10-04 19:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cultivo', '0006_remove_cultivodata_cultivo_csv_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='cultivodata',
            name='conjunto_datos',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='cuenta_area',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='curso',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='desviacion_y',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='distancia',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='duracion',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='elevacion',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='flj_cultivos_m',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='flj_cultivos_v',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='humedad_2',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='id_obj',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='lote',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='masa_rend_humedo',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='num_paso',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='producto',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='temp_aire',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='temp_suelo',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='tiempo',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='vel_viento',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='vol_rend_humedo',
        ),
        migrations.RemoveField(
            model_name='cultivodata',
            name='vol_rend_seco',
        ),
    ]
