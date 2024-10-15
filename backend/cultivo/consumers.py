from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync, sync_to_async
from django.db import transaction
from django.core.serializers import serialize
from cultivo.models import Cultivo, CultivoData
import json
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class RendimientoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.cultivo_id = self.scope['url_route']['kwargs']['cultivo_id']
        self.group_name = f"rendimiento_{self.cultivo_id}"

        # Inicializar variables de estado
        self.mapas = []
        self.current_pair_index = 0

        # Unirse al grupo de WebSocket
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"WebSocket conectado para cultivo_id: {self.cultivo_id}")

    async def disconnect(self, close_code):
        # Abandonar el grupo
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"WebSocket desconectado para cultivo_id: {self.cultivo_id}")

    async def receive(self, text_data):
        logger.info(f"Mensaje recibido: {text_data}")
        data = json.loads(text_data)
        action = data.get('action')
        logger.info(f"Acción recibida: {action}")

        if action == 'iniciar_proceso':
            await self.iniciar_proceso()
        elif action == 'enviar_coeficientes':
            coeficientes = data.get('coeficientes')
            await self.procesar_coeficientes(coeficientes)
        elif action == 'cancelar_proceso':
            await self.cancelar_proceso()


    async def iniciar_proceso(self):
        logger.info("Estoy en iniciar_proceso")
        result = await self.obtener_mapas_cultivo(self.cultivo_id)
        if result is None:
            await self.send(text_data=json.dumps({
                'action': 'error',
                'message': 'No hay mapas de rendimiento suficientes para el cultivo.'
            }))
            return

        self.df, self.archivos_unicos = result
        self.current_pair_index = 0

        # Inicializamos un DataFrame acumulado con el primer mapa
        archivo_mapa1 = self.archivos_unicos[self.current_pair_index]
        self.df_acumulado = self.df[self.df['nombre_archivo_csv'] == archivo_mapa1].copy()

        # Enviar el primer par de mapas
        await sync_to_async(self.transactional_enviar_nuevos_mapas)()

    def transactional_enviar_nuevos_mapas(self):
        with transaction.atomic():
            # Llamar a la función asíncrona desde el contexto síncrono
            async_to_sync(self.enviar_nuevos_mapas)()


    async def procesar_coeficientes(self, coeficientes):
        if self.current_pair_index >= len(self.archivos_unicos) - 1:
            await self.send(text_data=json.dumps({
                'action': 'proceso_completado'
            }))
            return

        # Ejecutar la actualización de coeficientes en una transacción
        await self.aplicar_transaccion(coeficientes)

        self.current_pair_index += 1

        if self.current_pair_index < len(self.archivos_unicos) - 1:
            await sync_to_async(self.transactional_enviar_nuevos_mapas)()
        else:
            await self.send(text_data=json.dumps({
                'action': 'proceso_completado'
            }))

    @sync_to_async
    @transaction.atomic
    def aplicar_transaccion(self, coeficientes):
        """Aplica los coeficientes a ambos mapas y actualiza el DataFrame acumulado"""
        coeficiente_mapa_referencia = float(coeficientes.get('coeficiente_mapa_referencia', 1))
        coeficiente_mapa_actual = float(coeficientes.get('coeficiente_mapa_actual', 1))

        # Ajustar el mapa de referencia (acumulado)
        if self.df_acumulado is not None:
            self.df_acumulado['rendimiento_relativo'] *= coeficiente_mapa_referencia

            # Actualizar la base de datos para el mapa de referencia
            for index, row in self.df_acumulado.iterrows():
                CultivoData.objects.filter(id=row['id']).update(rendimiento_relativo=row['rendimiento_relativo'])

        # Ajustar el mapa actual
        archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
        df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual].copy()
        df_mapa_actual['rendimiento_relativo'] *= coeficiente_mapa_actual

        # Actualizar la base de datos para el mapa actual
        for index, row in df_mapa_actual.iterrows():
            CultivoData.objects.filter(id=row['id']).update(rendimiento_relativo=row['rendimiento_relativo'])

        # Actualizar el DataFrame original
        self.df.loc[df_mapa_actual.index, 'rendimiento_relativo'] = df_mapa_actual['rendimiento_relativo']
        if self.df_acumulado is not None:
            self.df.loc[self.df_acumulado.index, 'rendimiento_relativo'] = self.df_acumulado['rendimiento_relativo']

        # Actualizar el DataFrame acumulado para incluir el mapa actual
        self.df_acumulado = pd.concat([self.df_acumulado, df_mapa_actual])

    @sync_to_async
    def obtener_mapas_cultivo(self, cultivo_id):
        logger.info(f"Obteniendo mapas de cultivo para el cultivo_id: {cultivo_id}")

        try:
            # Intentamos obtener el cultivo de la base de datos
            cultivo = Cultivo.objects.get(id=cultivo_id)
            logger.info(f"Cultivo obtenido: {cultivo}")
        except Cultivo.DoesNotExist:
            logger.error(f"El cultivo con id {cultivo_id} no existe.")
            return None

        # Obtener los mapas de rendimiento asociados al cultivo
        especie = cultivo.especie
        self.variacion_admitida = especie.variacion_admitida

        logger.info(f"Variación admitida para la especie: {self.variacion_admitida}")
        
        try:
            mapas_rendimiento = CultivoData.objects.filter(cultivo=cultivo).order_by('nombre_archivo_csv')
            logger.info(f"Mapas de rendimiento obtenidos: {mapas_rendimiento.count()}")
        except Exception as e:
            logger.error(f"Error al obtener los mapas de rendimiento: {str(e)}")
            return None

        if not mapas_rendimiento.exists():
            logger.warning(f"No hay mapas de rendimiento para el cultivo con id {cultivo_id}.")
            return None

        # Convertimos los datos a DataFrame de pandas
        try:
            mapas_list = list(mapas_rendimiento.values(
                'id', 'punto_geografico', 'anch_fja', 'humedad', 'masa_rend_seco',
                'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo', 'nombre_archivo_csv'
            ))
            df = pd.DataFrame(mapas_list)
            logger.info(f"DataFrame creado con {len(df)} filas.")
        except Exception as e:
            logger.error(f"Error al convertir los mapas de rendimiento a DataFrame: {str(e)}")
            return None

        # Verificar si tenemos suficientes mapas para comparar
        try:
            archivos_unicos = df['nombre_archivo_csv'].unique()
            logger.info(f"Archivos únicos obtenidos: {len(archivos_unicos)}")
        except Exception as e:
            logger.error(f"Error al obtener archivos únicos: {str(e)}")
            return None

        if len(archivos_unicos) < 2:
            logger.warning(f"No hay suficientes archivos únicos para la comparación.")
            return None

        return df, archivos_unicos

    async def enviar_nuevos_mapas(self):
        if self.current_pair_index < len(self.archivos_unicos) - 1:
            archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
            df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual]

            # Calcular coeficientes sugeridos para ambos mapas
            coeficiente_sugerido_referencia = self.calcular_coeficiente_sugerido(self.df_acumulado)
            coeficiente_sugerido_actual = self.calcular_coeficiente_sugerido(df_mapa_actual)

            # Obtener GeoJSON de los mapas
            mapa_referencia_geojson = await self.serializar_geojson(self.df_acumulado)
            mapa_actual_geojson = await self.serializar_geojson(df_mapa_actual)

            # Enviar los mapas y coeficientes sugeridos al cliente
            await self.send(text_data=json.dumps({
                'action': 'nuevos_mapas',
                'mapa_referencia': mapa_referencia_geojson,
                'mapa_actual': mapa_actual_geojson,
                'coeficiente_sugerido_referencia': coeficiente_sugerido_referencia,
                'coeficiente_sugerido_actual': coeficiente_sugerido_actual,
                'current_pair_index': self.current_pair_index
            }))
        else:
            await self.send(text_data=json.dumps({
                'action': 'proceso_completado'
            }))

    def calcular_coeficiente_sugerido(self, df_mapa):
        # Implementa aquí la lógica para calcular el coeficiente sugerido para un mapa
        # Por ejemplo, podrías usar la media o el percentil 80
        percentil_80 = df_mapa['masa_rend_seco'].quantile(0.8)
        coeficiente_sugerido = 1  # O la lógica que prefieras
        return coeficiente_sugerido


    async def serializar_geojson(self, df):
        mapa_ids = df['id'].tolist()
        queryset_mapa = await sync_to_async(list)(CultivoData.objects.filter(id__in=mapa_ids))
        geojson_mapa = await sync_to_async(serialize)(
            'geojson',
            queryset_mapa,
            geometry_field='punto_geografico',
            fields=['anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo']
        )
        return json.loads(geojson_mapa)

    @sync_to_async
    def obtener_dataframes_mapas(self, archivo_mapa1, archivo_mapa2):
        df1 = self.df[self.df['nombre_archivo_csv'] == archivo_mapa1]
        df2 = self.df[self.df['nombre_archivo_csv'] == archivo_mapa2]
        return df1, df2

    async def enviar_mapas_actualizados(self):
        """Envía todos los mapas actualizados al cliente después de aplicar los coeficientes"""
        mapas_actualizados = []

        for archivo_mapa in self.archivos_unicos:
            df_mapa = self.df[self.df['nombre_archivo_csv'] == archivo_mapa]
            mapa_ids = df_mapa['id'].tolist()

            # Obtener los registros actualizados
            queryset_mapa = await sync_to_async(list)(CultivoData.objects.filter(id__in=mapa_ids))

            # Serializar a GeoJSON
            geojson_mapa = await sync_to_async(serialize)(
                'geojson',
                queryset_mapa,
                geometry_field='punto_geografico',
                fields=['anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo']
            )

            mapas_actualizados.append(json.loads(geojson_mapa))

        # Enviar los mapas actualizados al cliente
        await self.send(text_data=json.dumps({
            'action': 'mapas_actualizados',
            'mapas': mapas_actualizados
        }))
