# Generated by Django 4.2 on 2024-10-01 03:16

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('gestion', '0001_initial'),
        ('campo', '0001_initial'),
        ('especie', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Cultivo',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('sub_total', models.FloatField()),
                ('rinde_prom', models.FloatField()),
                ('campo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='campo.campo')),
                ('especie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='especie.especie')),
                ('gestion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gestion.gestion')),
            ],
            options={
                'ordering': ['nombre'],
            },
        ),
    ]
