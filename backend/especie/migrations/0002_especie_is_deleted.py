# Generated by Django 4.2 on 2024-11-13 21:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('especie', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='especie',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]