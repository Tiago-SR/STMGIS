from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics
from .models import Cultivo, CultivoData
from .serializers import CultivoSerializer, CultivoDataGeoSerializer
import json
from django.core.serializers import serialize
from django.http import JsonResponse
from django.db import transaction
from django.contrib.gis.geos import Point
import chardet
from datetime import datetime
import pandas as pd
import io
import threading

class CultivoViewSet(viewsets.ModelViewSet):
    queryset = Cultivo.objects.all().order_by('nombre')
    serializer_class = CultivoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        campo = self.request.query_params.get('campo')
        especie = self.request.query_params.get('especie')

        if campo:
            queryset = queryset.filter(campo_id=campo)

        if especie:
            queryset = queryset.filter(especie_id=especie)

        return queryset

    @action(detail=True, methods=['post'], url_path='upload-csv')
    def upload_csv(self, request, pk=None):
        cultivo = get_object_or_404(Cultivo, pk=pk)
        
        files = request.FILES.getlist('archivos_csv')
        if not files:
            return Response({'error': 'No se subieron archivos.'}, status=status.HTTP_400_BAD_REQUEST)

        archivos_no_procesados = []
        for file in files:
            if CultivoData.objects.filter(cultivo=cultivo, nombre_archivo_csv=file.name).exists():
                archivos_no_procesados.append(file.name)
                continue
            
            file_content = file.read()
            thread = threading.Thread(target=save_csv_to_database, args=(file_content, cultivo, file.name))
            thread.start()

        if archivos_no_procesados:
            return Response(
                {
                    'message': 'Algunos archivos fueron procesados. Los siguientes archivos ya habían sido procesados previamente y no se procesaron de nuevo.',
                    'archivos_no_procesados': archivos_no_procesados
                },
                status=status.HTTP_202_ACCEPTED
            )
        else:
            return Response(
                {'message': 'Todos los archivos CSV han sido aceptados y se procesarán en segundo plano.'},
                status=status.HTTP_202_ACCEPTED
            )



def cultivodata_geojson_view(request):
    campo_id = request.GET.get('campo_id', None)

    if campo_id:
        queryset = CultivoData.objects.filter(cultivo__campo__id=campo_id)
    else:
        queryset = CultivoData.objects.all()

    geojson_str = serialize(
        "geojson",
        queryset,
        geometry_field="punto_geografico",
        fields=["prod"]
    )

    geojson = json.loads(geojson_str)

    return JsonResponse(geojson)

def detect_file_encoding(file_path):
    with open(file_path, 'rb') as f:
        result = chardet.detect(f.read())
    return result['encoding']

def save_csv_to_database(file_content, cultivo, file_name):
    try:
        encoding = chardet.detect(file_content)['encoding']
        decoded_content = file_content.decode(encoding)
        csv_file_like = io.StringIO(decoded_content)

        usecols = [
            'Longitude', 'Latitude', 'Anch. de fja.(m)', 'Humedad(%)',
            '(seco)Masa de rend.(tonne/ha)', 'Velocidad(km/h)', 'Prod.(ha/h)', 'Fecha'
        ]

        df = pd.read_csv(
            csv_file_like,
            delimiter=';',
            decimal=',',
            usecols=usecols
        )

        df.rename(columns={
            'Longitude': 'longitude',
            'Latitude': 'latitude',
            'Anch. de fja.(m)': 'anch_fja',
            'Humedad(%)': 'humedad',
            '(seco)Masa de rend.(tonne/ha)': 'masa_rend_seco',
            'Velocidad(km/h)': 'velocidad',
            'Prod.(ha/h)': 'prod',
            'Fecha': 'fecha',
        }, inplace=True)

        numeric_columns = ['longitude', 'latitude', 'anch_fja', 'humedad', 'masa_rend_seco', 'velocidad']

        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.')
                df[col] = pd.to_numeric(df[col], errors='coerce')

        if 'prod' in df.columns:
            df['prod'] = df['prod'].astype(str)

        df['fecha'] = pd.to_datetime(df['fecha'], format='%d/%m/%Y', errors='coerce').dt.date
        default_date = datetime(2023, 1, 1).date()
        df['fecha'].fillna(default_date, inplace=True)

        especie = cultivo.especie

        humedad_minima = especie.humedad_minima
        humedad_maxima = especie.humedad_maxima

        df_filtered = df[
            (df['humedad'] >= humedad_minima) &
            (df['humedad'] <= humedad_maxima)
        ].copy()

        if especie.variacion_admitida:
            masa_rend_seco_media = df_filtered['masa_rend_seco'].mean()

            variacion = especie.variacion_admitida / 100

            df_filtered = df_filtered[
                (df_filtered['masa_rend_seco'] >= masa_rend_seco_media * (1 - variacion)) &
                (df_filtered['masa_rend_seco'] <= masa_rend_seco_media * (1 + variacion))
            ].copy()

        batch_size = 500
        cultivo_data_instances = []

        for _, row in df_filtered.iterrows():
            if pd.isnull(row['longitude']) or pd.isnull(row['latitude']):
                continue

            punto_geografico = Point(float(row['longitude']), float(row['latitude']))
            cultivo_data = CultivoData(
                cultivo=cultivo,
                nombre_archivo_csv=file_name,
                punto_geografico=punto_geografico,
                anch_fja=row.get('anch_fja'),
                humedad=row.get('humedad'),
                masa_rend_seco=row.get('masa_rend_seco'),
                velocidad=row.get('velocidad'),
                prod=row.get('prod'),
                fecha=row.get('fecha')
            )
            cultivo_data_instances.append(cultivo_data)

            if len(cultivo_data_instances) >= batch_size:
                with transaction.atomic():
                    CultivoData.objects.bulk_create(cultivo_data_instances)
                cultivo_data_instances = []

        if cultivo_data_instances:
            with transaction.atomic():
                CultivoData.objects.bulk_create(cultivo_data_instances)

    except Exception as e:
        raise e
