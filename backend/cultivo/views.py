from api.pagination import StandardResultsSetPagination
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
#from geojson import Feature, FeatureCollection
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics
from .serializers import CultivoSerializer
import json
from django.core.files.temp import NamedTemporaryFile
import shapefile
import zipfile
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
from django.contrib.gis.geos import GEOSGeometry
from rendimiento_ambiente.models import RendimientoAmbiente
from ambientes.models import Ambiente
from django.db.models import F, OuterRef, Subquery



from django.http import Http404
from .models import Cultivo, CultivoData
from django_filters.rest_framework import DjangoFilterBackend
import logging

logger = logging.getLogger(__name__)

class CultivoListView(generics.ListAPIView):
    queryset = Cultivo.objects.all().order_by('nombre')
    serializer_class = CultivoSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['campo', 'especie', 'campo__empresa', 'gestion']

    def get_queryset(self):
        queryset = super().get_queryset()
        empresa_id = self.request.query_params.get('campo__empresa', None)

        if empresa_id:
            queryset = queryset.filter(campo__empresa=empresa_id)

        user = self.request.user

        if hasattr(user, 'responsable'):
            empresas_asignadas = user.responsable.empresas.all()
            queryset = queryset.filter(campo__empresa__in=empresas_asignadas)

        return queryset


class CultivoViewSet(viewsets.ModelViewSet):
    queryset = Cultivo.objects.all().order_by('nombre')
    serializer_class = CultivoSerializer
    pagination_class = None

    @action(detail=True, methods=['get'], url_path='is-normalized')
    def is_normalized(self, request, pk=None):
        cultivo = self.get_object()
        has_unormalized_data = CultivoData.objects.filter(cultivo=cultivo, rendimiento_normalizado=0).exists()
        all_normalized = not has_unormalized_data
        return Response({'all_normalized': all_normalized})

    def get_queryset(self):
        queryset = Cultivo.objects.all().order_by('nombre')
        user = self.request.user

        if hasattr(user, 'responsable'):
            empresas_asignadas = user.responsable.empresas.all()
            queryset = queryset.filter(campo__empresa__in=empresas_asignadas)

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
        fields=["rendimiento_real", 'masa_rend_seco', 'rendimiento_relativo', 'rendimiento_normalizado']
    )

    geojson = json.loads(geojson_str)

    return JsonResponse(geojson)

def cultivodata_geojson_por_cultivo_view(request):
    cultivo_id = request.GET.get('cultivo_id', None)
    if cultivo_id:
        queryset = CultivoData.objects.filter(cultivo__id=cultivo_id)
    else:
        return JsonResponse({"error": "Se requiere el parámetro cultivo_id"}, status=400)

    geojson_str = serialize(
        "geojson",
        queryset,
        geometry_field="punto_geografico",
        fields=["rendimiento_real", 'masa_rend_seco', 'rendimiento_relativo', 'rendimiento_normalizado']
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
                rendimiento_normalizado = 0,
                rendimiento_relativo = 0,
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

def download_shapefile_cultivo_data(request, cultivo_id):
    try:
        cultivo_data = CultivoData.objects.filter(cultivo_id=cultivo_id)
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        if not cultivo_data.exists():
            raise Http404("No se encontraron datos para el cultivo especificado.")
    except CultivoData.DoesNotExist:
        raise Http404("Cultivo no encontrado.")


    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                # Crear el shapefile con el autoBalance activado
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POINT) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir los campos
                    shp_writer.field("ArchivoCsv", "C", size=255)
                    shp_writer.field("AnchFja", "F", decimal=2)
                    shp_writer.field("Humedad", "F", decimal=2)
                    shp_writer.field("MasaRndSec", "F", decimal=2)
                    shp_writer.field("Velocidad", "F", decimal=2)
                    shp_writer.field("Fecha", "D")
                    shp_writer.field("RendReal", "F", decimal=2)
                    shp_writer.field("RendNorm", "F", decimal=2)
                    shp_writer.field("RendRel", "F", decimal=2)

                    # Agregar los puntos y sus atributos
                    for punto in cultivo_data:
                        shp_writer.point(punto.punto_geografico.x, punto.punto_geografico.y)
                        shp_writer.record(
                            ArchivoCsv=punto.nombre_archivo_csv,
                            AnchFja=punto.anch_fja or 0,
                            Humedad=punto.humedad or 0,
                            MasaRndSec=punto.masa_rend_seco or 0,
                            Velocidad=punto.velocidad or 0,
                            Fecha=punto.fecha,
                            RendReal=punto.rendimiento_real or 0,
                            RendNorm=punto.rendimiento_normalizado or 0,
                            RendRel=punto.rendimiento_relativo or 0
                        )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")

                zip_file.write(shp_file.name, f"Mapa_Rendimiento_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Mapa_Rendimiento_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Mapa_Rendimiento_{cultivo_nombre}.shx")


        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Mapa_Rendimiento_{cultivo_nombre}.zip"'
        return response

def download_rendimiento_ambiente_shapefile(request, cultivo_id):
    try:
        cultivo = Cultivo.objects.get(id=cultivo_id)
        rendimiento_ambiente = RendimientoAmbiente.objects.filter(cultivo=cultivo).select_related('ambiente')
        if not rendimiento_ambiente.exists():
            raise Http404("No se encontraron datos de rendimiento para el cultivo especificado.")
    except Cultivo.DoesNotExist:
        raise Http404("Cultivo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir campos del shapefile
                    shp_writer.field("idA", "C", size=50)
                    shp_writer.field("name", "C", size=255)
                    shp_writer.field("ambiente", "C", size=255)
                    shp_writer.field("area", "F", decimal=2)
                    shp_writer.field("RendReal", "F", decimal=2)

                    # Añadir los multipolígonos y sus atributos
                    for rendimiento in rendimiento_ambiente:
                        if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom:
                            geom = json.loads(rendimiento.ambiente.ambiente_geom.json)
                            if geom['type'] == 'MultiPolygon':
                                for polygon in geom['coordinates']:
                                    shp_writer.poly(polygon)
                            else:
                                shp_writer.poly(geom['coordinates'])

                            shp_writer.record(
                                idA=rendimiento.ambiente.idA,
                                name=rendimiento.ambiente.name or '',
                                ambiente=rendimiento.ambiente.ambiente or '',
                                area=rendimiento.ambiente.area or 0,
                                RendReal=rendimiento.rendimiento_real_promedio or 0
                            )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")
                zip_file.write(shp_file.name, f"Rendimiento_Ambiente_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Rendimiento_Ambiente_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Rendimiento_Ambiente_{cultivo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        # El nombre del archivo de descarga incluirá el nombre del cultivo
        nombre_archivo = cultivo.nombre.replace(" ", "_")
        response['Content-Disposition'] = f'attachment; filename="Rendimiento_Ambiente_{cultivo_nombre}.zip"'
        return response

def download_extraccion_p_ambiente_shapefile(request, cultivo_id):
    try:
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        rendimiento_ambiente = RendimientoAmbiente.objects.filter(cultivo=cultivo).select_related('ambiente')

        if not rendimiento_ambiente.exists():
            raise Http404("No se encontraron datos de rendimiento para el cultivo especificado.")

        # Validar que la especie tenga el valor de fósforo en nutrientes
        if 'Fosforo' not in especie.nutrientes:
            raise Http404("La especie del cultivo no tiene definido el valor de fósforo en nutrientes.")

        fosforo_valor = especie.nutrientes.get("Fosforo", 0)

    except Cultivo.DoesNotExist:
        raise Http404("Cultivo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir campos del shapefile
                    shp_writer.field("idA", "C", size=50)
                    shp_writer.field("name", "C", size=255)
                    shp_writer.field("ambiente", "C", size=255)
                    shp_writer.field("area", "F", decimal=2)
                    shp_writer.field("ExtraccionP", "F", decimal=2)

                    # Añadir los multipolígonos y sus atributos
                    for rendimiento in rendimiento_ambiente:
                        if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom:
                            geom = json.loads(rendimiento.ambiente.ambiente_geom.json)
                            extraccion_p = rendimiento.rendimiento_real_promedio * fosforo_valor

                            # Añadir geometría (soporta MultiPolygon)
                            if geom['type'] == 'MultiPolygon':
                                for polygon in geom['coordinates']:
                                    shp_writer.poly(polygon)
                            else:
                                shp_writer.poly(geom['coordinates'])

                            # Añadir los datos al registro
                            shp_writer.record(
                                idA=rendimiento.ambiente.idA,
                                name=rendimiento.ambiente.name or '',
                                ambiente=rendimiento.ambiente.ambiente or '',
                                area=rendimiento.ambiente.area or 0,
                                ExtraccionP=extraccion_p or 0
                            )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")
                zip_file.write(shp_file.name, f"Extraccion_P_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Extraccion_P_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Extraccion_P_{cultivo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Extraccion_P_{cultivo_nombre}.zip"'
        return response

def download_extraccion_k_ambiente_shapefile(request, cultivo_id):
    try:
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        rendimiento_ambiente = RendimientoAmbiente.objects.filter(cultivo=cultivo).select_related('ambiente')

        if not rendimiento_ambiente.exists():
            raise Http404("No se encontraron datos de rendimiento para el cultivo especificado.")

        # Validar que la especie tenga el valor de fósforo en nutrientes
        if 'Potasio' not in especie.nutrientes:
            raise Http404("La especie del cultivo no tiene definido el valor de potasio en nutrientes.")

        potasio_valor = especie.nutrientes.get("Potasio", 0)

    except Cultivo.DoesNotExist:
        raise Http404("Cultivo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir campos del shapefile
                    shp_writer.field("idA", "C", size=50)
                    shp_writer.field("name", "C", size=255)
                    shp_writer.field("ambiente", "C", size=255)
                    shp_writer.field("area", "F", decimal=2)
                    shp_writer.field("ExtraccionK", "F", decimal=2)

                    # Añadir los multipolígonos y sus atributos
                    for rendimiento in rendimiento_ambiente:
                        if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom:
                            geom = json.loads(rendimiento.ambiente.ambiente_geom.json)
                            extraccion_k = rendimiento.rendimiento_real_promedio * potasio_valor

                            # Añadir geometría (soporta MultiPolygon)
                            if geom['type'] == 'MultiPolygon':
                                for polygon in geom['coordinates']:
                                    shp_writer.poly(polygon)
                            else:
                                shp_writer.poly(geom['coordinates'])

                            # Añadir los datos al registro
                            shp_writer.record(
                                idA=rendimiento.ambiente.idA,
                                name=rendimiento.ambiente.name or '',
                                ambiente=rendimiento.ambiente.ambiente or '',
                                area=rendimiento.ambiente.area or 0,
                                ExtraccionK=extraccion_k or 0
                            )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")
                zip_file.write(shp_file.name, f"Extraccion_K_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Extraccion_K_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Extraccion_K_{cultivo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Extraccion_K_{cultivo_nombre}.zip"'
        return response

def download_extraccion_n_ambiente_shapefile(request, cultivo_id):
    try:
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        rendimiento_ambiente = RendimientoAmbiente.objects.filter(cultivo=cultivo).select_related('ambiente')

        if not rendimiento_ambiente.exists():
            raise Http404("No se encontraron datos de rendimiento para el cultivo especificado.")

        # Validar que la especie tenga el valor de Nitrógeno en nutrientes
        if 'Nitrogeno' not in especie.nutrientes:
            raise Http404("La especie del cultivo no tiene definido el valor de nitrógeno en nutrientes.")

        nitrogeno_valor = especie.nutrientes.get("Nitrogeno", 0)

    except Cultivo.DoesNotExist:
        raise Http404("Cultivo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir campos del shapefile
                    shp_writer.field("idA", "C", size=50)
                    shp_writer.field("name", "C", size=255)
                    shp_writer.field("ambiente", "C", size=255)
                    shp_writer.field("area", "F", decimal=2)
                    shp_writer.field("ExtraccionN", "F", decimal=2)

                    # Añadir los multipolígonos y sus atributos
                    for rendimiento in rendimiento_ambiente:
                        if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom:
                            geom = json.loads(rendimiento.ambiente.ambiente_geom.json)
                            extraccion_n = rendimiento.rendimiento_real_promedio * nitrogeno_valor

                            # Añadir geometría (soporta MultiPolygon)
                            if geom['type'] == 'MultiPolygon':
                                for polygon in geom['coordinates']:
                                    shp_writer.poly(polygon)
                            else:
                                shp_writer.poly(geom['coordinates'])

                            # Añadir los datos al registro
                            shp_writer.record(
                                idA=rendimiento.ambiente.idA,
                                name=rendimiento.ambiente.name or '',
                                ambiente=rendimiento.ambiente.ambiente or '',
                                area=rendimiento.ambiente.area or 0,
                                ExtraccionN=extraccion_n or 0
                            )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")
                zip_file.write(shp_file.name, f"Extraccion_N_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Extraccion_N_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Extraccion_N_{cultivo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Extraccion_N_{cultivo_nombre}.zip"'
        return response

def download_coeficiente_variacion_shapefile(request, cultivo_id):
    try:
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        coef_variaciones = RendimientoAmbiente.objects.filter(cultivo=cultivo).select_related('ambiente')

        if not coef_variaciones.exists():
            raise Http404("No se encontraron datos de coeficiente de variación para el cultivo especificado.")

    except Cultivo.DoesNotExist:
        raise Http404("Cultivo no encontrado.")

    with NamedTemporaryFile(suffix='.zip') as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zip_file:
            with NamedTemporaryFile(suffix='.shp') as shp_file:
                with shapefile.Writer(shp_file.name, shapeType=shapefile.POLYGON) as shp_writer:
                    shp_writer.autoBalance = 1

                    # Definir campos del shapefile
                    shp_writer.field("idA", "C", size=50)
                    shp_writer.field("name", "C", size=255)
                    shp_writer.field("ambiente", "C", size=255)
                    shp_writer.field("area", "F", decimal=2)
                    shp_writer.field("CoefVarReal", "F", decimal=2)

                    # Añadir los multipolígonos y sus atributos
                    for coef_variacion in coef_variaciones:
                        if coef_variacion.ambiente and coef_variacion.ambiente.ambiente_geom:
                            geom = json.loads(coef_variacion.ambiente.ambiente_geom.json)
                            coef_var_real = coef_variacion.coef_variacion_real or 0  # Asegúrate de que el campo existe y tiene un valor

                            # Añadir geometría (soporta MultiPolygon)
                            if geom['type'] == 'MultiPolygon':
                                for polygon in geom['coordinates']:
                                    shp_writer.poly(polygon)
                            else:
                                shp_writer.poly(geom['coordinates'])

                            # Añadir los datos al registro
                            shp_writer.record(
                                idA=coef_variacion.ambiente.idA,
                                name=coef_variacion.ambiente.name or '',
                                ambiente=coef_variacion.ambiente.ambiente or '',
                                area=coef_variacion.ambiente.area or 0,
                                CoefVarReal=coef_var_real * 100  # Convertir a porcentaje
                            )

                # Agregar los archivos SHP, DBF y SHX al ZIP
                cultivo_nombre = cultivo.nombre.replace(" ", "_")
                zip_file.write(shp_file.name, f"Ajuste_MBA_{cultivo_nombre}.shp")
                zip_file.write(shp_file.name.replace('.shp', '.dbf'), f"Ajuste_MBA_{cultivo_nombre}.dbf")
                zip_file.write(shp_file.name.replace('.shp', '.shx'), f"Ajuste_MBA_{cultivo_nombre}.shx")

        temp_zip.seek(0)
        response = HttpResponse(temp_zip.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Ajuste_MBA_{cultivo_nombre}.zip"'
        return response

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

def rendimiento_ambiente_geojson_view(request, cultivo_id):
    try:
        print(f"Procesando cultivo_id: {cultivo_id}")
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        print(f"Cultivo encontrado: {cultivo.nombre}")

        # Primero, obtener los rendimientos por ambiente
        rendimientos = RendimientoAmbiente.objects.filter(
            cultivo=cultivo
        ).select_related('ambiente')

        print(f"Rendimientos encontrados: {rendimientos.count()}")

        # Crear el GeoJSON manualmente
        features = []
        rendimientos_valores = []

        for rendimiento in rendimientos:
            if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom and rendimiento.rendimiento_real_promedio:
                # Guardar el valor para calcular percentiles
                rendimientos_valores.append(float(rendimiento.rendimiento_real_promedio))

                feature = {
                    'type': 'Feature',
                    'geometry': json.loads(rendimiento.ambiente.ambiente_geom.json),
                    'properties': {
                        'idA': rendimiento.ambiente.idA,
                        'name': rendimiento.ambiente.name or '',
                        'ambiente': rendimiento.ambiente.ambiente or '',
                        'area': float(rendimiento.ambiente.area) if rendimiento.ambiente.area else 0,
                        'rendimiento_real': float(rendimiento.rendimiento_real_promedio),
                    }
                }
                features.append(feature)

        print(f"Features creadas: {len(features)}")
        print(f"Rendimientos valores: {rendimientos_valores}")

        # Calcular percentiles
        if rendimientos_valores:
            rendimientos_valores.sort()
            n = len(rendimientos_valores)
            percentiles = {
                'p20': rendimientos_valores[int(n * 0.2)],
                'p40': rendimientos_valores[int(n * 0.4)],
                'p60': rendimientos_valores[int(n * 0.6)],
                'p80': rendimientos_valores[int(n * 0.8)],
                'max': rendimientos_valores[-1]
            }
        else:
            percentiles = {
                'p20': 0,
                'p40': 0,
                'p60': 0,
                'p80': 0,
                'max': 0
            }

        print(f"Percentiles calculados: {percentiles}")

        # Crear la respuesta GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'percentiles': percentiles
        }

        return JsonResponse(geojson, safe=False)

    except Exception as e:
        print(f"Error en rendimiento_ambiente_geojson_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': f'Error al obtener datos: {str(e)}'},
            status=500
        )

def coeficiente_variacion_geojson_view(request, cultivo_id):
    try:
        # Obtener el cultivo especificado
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)

        # Obtener todos los registros de RendimientoAmbiente asociados con este cultivo
        rendimientos = RendimientoAmbiente.objects.filter(
            cultivo=cultivo
        ).select_related('ambiente')

        # Crear una lista de características (features) para el GeoJSON
        features = []
        coeficientes_variacion = []

        for rendimiento in rendimientos:
            if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom:
                # Agregar el coeficiente de variación a la lista para su clasificación
                coef_variacion_real = rendimiento.coef_variacion_real * 100 if rendimiento.coef_variacion_real else 0
                coeficientes_variacion.append(coef_variacion_real)

                # Crear la característica (feature) con las propiedades requeridas
                feature = {
                    'type': 'Feature',
                    'geometry': json.loads(rendimiento.ambiente.ambiente_geom.json),
                    'properties': {
                        'idA': rendimiento.ambiente.idA,
                        'name': rendimiento.ambiente.name or '',
                        'ambiente': rendimiento.ambiente.ambiente or '',
                        'area': float(rendimiento.ambiente.area) if rendimiento.ambiente.area else 0,
                        'coeficiente_variacion_real': coef_variacion_real,  # Convertido a porcentaje
                        'coeficiente_variacion_relativo': float(rendimiento.coef_variacion_relativo) * 100 if rendimiento.coef_variacion_relativo else 0  # Convertido a porcentaje
                    }
                }
                features.append(feature)

        # Definir las clases de percentiles como rangos fijos
        clases_percentiles = {
            'bajo': 20,    # 0-20%
            'medio': 40,   # 21-40%
            'alto': 100    # Más de 40%
        }

        # Crear la respuesta en formato GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'clases_percentiles': clases_percentiles
        }

        return JsonResponse(geojson, safe=False)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': f'Error al obtener datos: {str(e)}'},
            status=500
        )

def extraccion_p_ambiente_geojson_view(request, cultivo_id):
    try:
        print(f"Procesando cultivo_id: {cultivo_id}")
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        print(f"Cultivo encontrado: {cultivo.nombre}")
        print(f"Especie: {especie.nombre}")

        # Primero, obtener los rendimientos por ambiente
        rendimientos = RendimientoAmbiente.objects.filter(
            cultivo=cultivo
        ).select_related('ambiente')

        print(f"Rendimientos encontrados: {rendimientos.count()}")

        # Crear el GeoJSON manualmente
        features = []
        rendimientos_valores = []

        for rendimiento in rendimientos:
            if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom and rendimiento.rendimiento_real_promedio:
                # Calcular la extracción de P
                if 'Fosforo' in especie.nutrientes:
                    extraccion_p = rendimiento.rendimiento_real_promedio * especie.nutrientes.get("Fosforo", 0)
                else:
                    extraccion_p = 0
                    print(f"No se encontró el valor de 'Fósforo' para la especie '{especie.nombre}'")

                # Guardar el valor para calcular percentiles
                rendimientos_valores.append(extraccion_p)

                feature = {
                    'type': 'Feature',
                    'geometry': json.loads(rendimiento.ambiente.ambiente_geom.json),
                    'properties': {
                        'idA': rendimiento.ambiente.idA,
                        'name': rendimiento.ambiente.name or '',
                        'ambiente': rendimiento.ambiente.ambiente or '',
                        'area': float(rendimiento.ambiente.area) if rendimiento.ambiente.area else 0,
                        'extraccion_p': extraccion_p
                    }
                }
                features.append(feature)

        print(f"Features creadas: {len(features)}")
        print(f"Valores de extracción de P: {rendimientos_valores}")

        # Calcular percentiles
        if rendimientos_valores:
            rendimientos_valores.sort()
            n = len(rendimientos_valores)
            percentiles = {
                'p20': rendimientos_valores[int(n * 0.2)],
                'p40': rendimientos_valores[int(n * 0.4)],
                'p60': rendimientos_valores[int(n * 0.6)],
                'p80': rendimientos_valores[int(n * 0.8)],
                'max': rendimientos_valores[-1]
            }
        else:
            percentiles = {
                'p20': 0,
                'p40': 0,
                'p60': 0,
                'p80': 0,
                'max': 0
            }

        print(f"Percentiles calculados: {percentiles}")

        # Crear la respuesta GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'percentiles': percentiles,
            'especie': {
                'nombre': especie.nombre,
                'nutrientes': especie.nutrientes
            }
        }

        return JsonResponse(geojson, safe=False)

    except Exception as e:
        print(f"Error en extraccion_p_ambiente_geojson_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': f'Error al obtener datos: {str(e)}'},
            status=500
        )

def extraccion_k_ambiente_geojson_view(request, cultivo_id):

    try:
        print(f"Procesando cultivo_id: {cultivo_id}")
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        print(f"Cultivo encontrado: {cultivo.nombre}")
        print(f"Especie: {especie.nombre}")

        # Primero, obtener los rendimientos por ambiente
        rendimientos = RendimientoAmbiente.objects.filter(
            cultivo=cultivo
        ).select_related('ambiente')

        print(f"Rendimientos encontrados: {rendimientos.count()}")

        # Crear el GeoJSON manualmente
        features = []
        rendimientos_valores = []

        for rendimiento in rendimientos:
            if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom and rendimiento.rendimiento_real_promedio:
                # Calcular la extracción de P
                if 'Potasio' in especie.nutrientes:
                    extraccion_k = rendimiento.rendimiento_real_promedio * especie.nutrientes.get("Potasio", 0)
                else:
                    extraccion_k = 0
                    print(f"No se encontró el valor de 'Potasio' para la especie '{especie.nombre}'")

                # Guardar el valor para calcular percentiles
                rendimientos_valores.append(extraccion_k)

                feature = {
                    'type': 'Feature',
                    'geometry': json.loads(rendimiento.ambiente.ambiente_geom.json),
                    'properties': {
                        'idA': rendimiento.ambiente.idA,
                        'name': rendimiento.ambiente.name or '',
                        'ambiente': rendimiento.ambiente.ambiente or '',
                        'area': float(rendimiento.ambiente.area) if rendimiento.ambiente.area else 0,
                        'extraccion_k': extraccion_k
                    }
                }
                features.append(feature)

        print(f"Features creadas: {len(features)}")
        print(f"Valores de extracción de P: {rendimientos_valores}")

        # Calcular percentiles
        if rendimientos_valores:
            rendimientos_valores.sort()
            n = len(rendimientos_valores)
            percentiles = {
                'p20': rendimientos_valores[int(n * 0.2)],
                'p40': rendimientos_valores[int(n * 0.4)],
                'p60': rendimientos_valores[int(n * 0.6)],
                'p80': rendimientos_valores[int(n * 0.8)],
                'max': rendimientos_valores[-1]
            }
        else:
            percentiles = {
                'p20': 0,
                'p40': 0,
                'p60': 0,
                'p80': 0,
                'max': 0
            }

        # Crear la respuesta GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'percentiles': percentiles,
            'especie': {
                'nombre': especie.nombre,
                'nutrientes': especie.nutrientes
            }
        }

        return JsonResponse(geojson, safe=False)

    except Exception as e:
        print(f"Error en extraccion_p_ambiente_geojson_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': f'Error al obtener datos: {str(e)}'},
            status=500
        )

def extraccion_n_ambiente_geojson_view(request, cultivo_id):
    try:
        print(f"Procesando cultivo_id: {cultivo_id}")
        cultivo = get_object_or_404(Cultivo, id=cultivo_id)
        especie = cultivo.especie
        print(f"Cultivo encontrado: {cultivo.nombre}")
        print(f"Especie: {especie.nombre}")

        # Obtener los rendimientos por ambiente
        rendimientos = RendimientoAmbiente.objects.filter(
            cultivo=cultivo
        ).select_related('ambiente')

        print(f"Rendimientos encontrados: {rendimientos.count()}")

        # Crear el GeoJSON manualmente
        features = []
        rendimientos_valores = []

        for rendimiento in rendimientos:
            if rendimiento.ambiente and rendimiento.ambiente.ambiente_geom and rendimiento.rendimiento_real_promedio:
                # Calcular la extracción de Nitrógeno
                if 'Nitrogeno' in especie.nutrientes:
                    extraccion_n = rendimiento.rendimiento_real_promedio * especie.nutrientes.get("Nitrogeno", 0)
                else:
                    extraccion_n = 0
                    print(f"No se encontró el valor de 'Nitrógeno' para la especie '{especie.nombre}'")

                # Guardar el valor para calcular percentiles
                rendimientos_valores.append(extraccion_n)

                feature = {
                    'type': 'Feature',
                    'geometry': json.loads(rendimiento.ambiente.ambiente_geom.json),
                    'properties': {
                        'idA': rendimiento.ambiente.idA,
                        'name': rendimiento.ambiente.name or '',
                        'ambiente': rendimiento.ambiente.ambiente or '',
                        'area': float(rendimiento.ambiente.area) if rendimiento.ambiente.area else 0,
                        'extraccion_n': extraccion_n
                    }
                }
                features.append(feature)

        print(f"Features creadas: {len(features)}")
        print(f"Valores de extracción de N: {rendimientos_valores}")

        # Calcular percentiles
        if rendimientos_valores:
            rendimientos_valores.sort()
            n = len(rendimientos_valores)
            percentiles = {
                'p20': rendimientos_valores[int(n * 0.2)],
                'p40': rendimientos_valores[int(n * 0.4)],
                'p60': rendimientos_valores[int(n * 0.6)],
                'p80': rendimientos_valores[int(n * 0.8)],
                'max': rendimientos_valores[-1]
            }
        else:
            percentiles = {
                'p20': 0,
                'p40': 0,
                'p60': 0,
                'p80': 0,
                'max': 0
            }

        # Crear la respuesta GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'percentiles': percentiles,
            'especie': {
                'nombre': especie.nombre,
                'nutrientes': especie.nutrientes
            }
        }

        return JsonResponse(geojson, safe=False)

    except Exception as e:
        print(f"Error en extraccion_n_ambiente_geojson_view: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': f'Error al obtener datos: {str(e)}'},
            status=500
        )
