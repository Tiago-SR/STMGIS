# Generated by Django 4.2 on 2024-09-27 15:54

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('especie', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='especie',
            options={'ordering': ['nombre']},
        ),
    ]
