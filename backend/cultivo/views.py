#from geojson import Feature, FeatureCollection
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics
from .models import Cultivo, CultivoData
from .serializers import CultivoSerializer, CultivoDataGeoSerializer
import json

from django.http import StreamingHttpResponse
import time
from django.core.serializers import serialize
from django.http import JsonResponse
from django.db import transaction
from django.contrib.gis.geos import Point
import chardet
from datetime import datetime
import pandas as pd
import io
import threading
import uuid
from django.core.cache import cache
from django.http import HttpResponse, Http404
from .models import Cultivo, CultivoData

from django.contrib.gis.geos import GEOSGeometry
#from geojson import  FeatureCollection, Point
#from geojson import Feature, FeatureCollection, Point

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
        file_contents = []
        columnas_requeridas = [
            'Longitude', 'Latitude', 'Anch. de fja.(m)', 'Humedad(%)', 
            '(seco)Masa de rend.(tonne/ha)', 'Velocidad(km/h)', 'Fecha'
        ]

        for file in files:
            if CultivoData.objects.filter(cultivo=cultivo, nombre_archivo_csv=file.name).exists():
                archivos_no_procesados.append(file.name)
            else:
                file_contents.append((file.read(), file.name))

        if len(archivos_no_procesados) == len(files):
            return Response(
                {'error': 'Todos los archivos ya han sido procesados previamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO Optimizar e implementar denuevo estos chequeos
        # for file_content, file_name in file_contents:
        #     # Detectar la codificación del archivo
        #     encoding = chardet.detect(file_content)['encoding']
        #     decoded_content = file_content.decode(encoding)
        #     csv_file_like = io.StringIO(decoded_content)

        #     # Leer el CSV con pandas
        #     try:
        #         df = pd.read_csv(
        #             csv_file_like,
        #             delimiter=';',
        #             decimal=',',
        #             nrows=0
        #         )

        #         columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]
        #         if columnas_faltantes:
        #             return Response(
        #                 {'error': f'El archivo {file_name} no contiene las siguientes columnas requeridas: {", ".join(columnas_faltantes)}.'},
        #                 status=status.HTTP_400_BAD_REQUEST
        #             )

            # except Exception as e:
            #     return Response({'error': f'Error al procesar el archivo {file_name}: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        upload_id = str(uuid.uuid4())
        cache.set(f'upload_status_{upload_id}', 'in_progress', timeout=3600)

        def process_files():
            threads = []
            for file_content, file_name in file_contents:
                thread = threading.Thread(target=save_csv_to_database, args=(file_content, cultivo, file_name))
                threads.append(thread)
                thread.start()

            for thread in threads:
                thread.join()

            cache.set(f'upload_status_{upload_id}', 'completed', timeout=3600)

        processing_thread = threading.Thread(target=process_files)
        processing_thread.start()

        if archivos_no_procesados:
            return Response(
                {
                    'message': 'Algunos archivos fueron procesados. Los siguientes archivos ya habían sido procesados previamente y no se procesaron de nuevo.',
                    'archivos_no_procesados': archivos_no_procesados,
                    'upload_id': upload_id
                },
                status=status.HTTP_202_ACCEPTED
            )

        return Response(
            {
                'message': 'Todos los archivos CSV han sido aceptados y se procesarán en segundo plano.',
                'upload_id': upload_id
            },
            status=status.HTTP_202_ACCEPTED
        )

def cultivodata_geojson_view(request):
    campo_id = request.GET.get('campo_id', None)
    # TODO agregar query param para rendimiento realtivo o real
    if campo_id:
        queryset = CultivoData.objects.filter(cultivo__campo__id=campo_id)
    else:
        queryset = CultivoData.objects.all()

    geojson_str = serialize(
        "geojson",
        queryset,
        geometry_field="punto_geografico",
        fields=["rendimiento_relativo"]
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
            '(seco)Masa de rend.(tonne/ha)', 'Velocidad(km/h)', 'Fecha'
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
            'Fecha': 'fecha',
        }, inplace=True)

        numeric_columns = ['longitude', 'latitude', 'anch_fja', 'humedad', 'masa_rend_seco', 'velocidad']

        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.')
                df[col] = pd.to_numeric(df[col], errors='coerce')

        df['fecha'] = pd.to_datetime(df['fecha'], format='%d/%m/%Y', errors='coerce').dt.date
        default_date = datetime(2023, 1, 1).date()
        df['fecha'].fillna(default_date, inplace=True)

        especie = cultivo.especie

        humedad_minima = especie.humedad_minima
        humedad_maxima = especie.humedad_maxima


        # Aplicar filtro para 'humedad' 1

        df_filtered = df[
            (df['humedad'] >= humedad_minima) &
            (df['humedad'] <= humedad_maxima)
        ].copy()

    
        # Aplicar filtro para 'anch_fja' 2
        max_anch_fja = df_filtered['anch_fja'].max()
        threshold_anch_fja = max_anch_fja * 0.9
        df_filtered = df_filtered[
            df_filtered['anch_fja'] >= threshold_anch_fja
        ].copy()

            # Aplicar filtro para 'velocidad' 3
        mean_velocidad = df_filtered['velocidad'].mean()
        std_velocidad = df_filtered['velocidad'].std()
        df_filtered = df_filtered[
            (df_filtered['velocidad'] >= mean_velocidad - 3 * std_velocidad) &
            (df_filtered['velocidad'] <= mean_velocidad + 3 * std_velocidad)
        ].copy()

        
        # Aplicar filtro para 'masa_rend_seco' 4
        mean_masa = df_filtered['masa_rend_seco'].mean()
        std_masa = df_filtered['masa_rend_seco'].std()
        df_filtered = df_filtered[
            (df_filtered['masa_rend_seco'] >= mean_masa - 3 * std_masa) &
            (df_filtered['masa_rend_seco'] <= mean_masa + 3 * std_masa)
        ].copy()


        # calcular media de masa de rendimiento seco ->
        #  despues hay que hacer masa de rendimiento seco / media obtenida 
        # (esto para cada row) -> se almacena ese dato resultante en la columna rendimiento-relativo

        media_rendimiento_relativo = df_filtered['masa_rend_seco'].mean()

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
                fecha=row.get('fecha'),
                rendimiento_relativo = row.get('masa_rend_seco')/ media_rendimiento_relativo,
                rendimiento_real = 0,
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

def normalizar_mapas_rendimiento(request, cultivo_id, siguiente_par=0):
    try:
        cultivo = Cultivo.objects.get(id=cultivo_id)
    except Cultivo.DoesNotExist:
        return JsonResponse({"error": "Cultivo no encontrado"}, status=404)

    especie = cultivo.especie
    variacion_admitida = especie.variacion_admitida

    # Obtener los mapas de rendimiento del cultivo
    mapas_rendimiento = CultivoData.objects.filter(cultivo=cultivo).order_by('nombre_archivo_csv')
    if not mapas_rendimiento.exists():
        return JsonResponse({"error": "No hay mapas de rendimiento para el cultivo"}, status=400)

    # Convertir los datos en DataFrames de pandas
    mapas_list = list(mapas_rendimiento.values(
        'id', 'punto_geografico', 'anch_fja', 'humedad', 'masa_rend_seco', 
        'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo', 'nombre_archivo_csv'
    ))

    df = pd.DataFrame(mapas_list)

    # Verificar si tenemos suficientes mapas para comparar
    archivos_unicos = df['nombre_archivo_csv'].unique()
    if len(archivos_unicos) <= siguiente_par + 1:
        return JsonResponse({"error": "No hay suficientes mapas para normalizar."}, status=400)

    # Seleccionar los dos mapas a comparar basados en el nombre del archivo CSV
    archivo_mapa1 = archivos_unicos[siguiente_par]
    archivo_mapa2 = archivos_unicos[siguiente_par + 1]

    df1 = df[df['nombre_archivo_csv'] == archivo_mapa1]
    df2 = df[df['nombre_archivo_csv'] == archivo_mapa2]

    # Calcular el percentil 80 de cada mapa en base al rendimiento seco
    percentil_80_df1 = df1['masa_rend_seco'].quantile(0.8)
    percentil_80_df2 = df2['masa_rend_seco'].quantile(0.8)

    # Normalizar los mapas si es necesario
    coeficiente_ajuste1 = 1
    coeficiente_ajuste = 1
    variacion = abs(percentil_80_df1 - percentil_80_df2) / max(percentil_80_df1, percentil_80_df2)
    if variacion > variacion_admitida:
        coeficiente_ajuste = percentil_80_df1 / percentil_80_df2
        df2.loc[:, 'rendimiento_real'] = df2['masa_rend_seco'] * coeficiente_ajuste
    else:
        df2.loc[:, 'rendimiento_real'] = df2['masa_rend_seco']

    # Obtener las geometrías de los mapas seleccionados
    mapa1_ids = df1['id'].tolist()
    mapa2_ids = df2['id'].tolist()

    queryset_mapa1 = CultivoData.objects.filter(id__in=mapa1_ids)
    queryset_mapa2 = CultivoData.objects.filter(id__in=mapa2_ids)

    # Serializar a GeoJSON usando Django
    geojson_mapa1 = serialize(
        'geojson',
        queryset_mapa1,
        geometry_field='punto_geografico',        
        fields=['anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo']
    )

    geojson_mapa2 = serialize(
        'geojson',
        queryset_mapa2,
        geometry_field='punto_geografico',
        fields=['anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo' ]
    )

    # Preparar el contexto para la respuesta JSON
    cultivo_data = {
        'id': str(cultivo.id),
        'nombre': cultivo.nombre,
        'especie': cultivo.especie.nombre,
    }
    
    context = {
        'cultivo': cultivo_data,
        'coeficiente_ajuste1': coeficiente_ajuste1,
        'coeficiente_ajuste2': coeficiente_ajuste,
        'mapa1': json.loads(geojson_mapa1),
        'mapa2': json.loads(geojson_mapa2),
        'percentil_80_df1': percentil_80_df1,
        'percentil_80_df2': percentil_80_df2,
        'siguiente_par': siguiente_par,
    }
    
    return JsonResponse(context, status=200)

def sse_notify(request, upload_id):
    def event_stream():
        status = cache.get(f'upload_status_{upload_id}')

        if status is None:
            raise Http404("El proceso no fue encontrado.")

        while True:
            status = cache.get(f'upload_status_{upload_id}', 'in_progress')
            
            if status == 'completed':
                yield 'data: El proceso ha terminado.\n\n'
                cache.delete(f'upload_status_{upload_id}')
                break
            
            yield 'data: ping\n\n'
            time.sleep(15)

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response