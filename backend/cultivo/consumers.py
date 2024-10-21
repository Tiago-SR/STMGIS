from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync, sync_to_async
from channels.db import database_sync_to_async

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
            # Aquí llamamos a calcular_rendimientos_finales
            await self.calcular_rendimientos_finales()
            await self.send(text_data=json.dumps({
                'action': 'proceso_completado'
            }))
            return

        # Ejecutar la actualización de coeficientes en una transacción
        await self.aplicar_transaccion(coeficientes)

        # Actualizamos el DataFrame acumulado
        archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
        df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual].copy()

        # Actualizar el DataFrame acumulado
        self.df_acumulado = pd.concat([self.df_acumulado, df_mapa_actual])
        
        self.current_pair_index += 1

        if self.current_pair_index < len(self.archivos_unicos) - 1:
            await sync_to_async(self.transactional_enviar_nuevos_mapas)()
        else:
            # Aquí también llamamos a calcular_rendimientos_finales si es el último par
            await self.calcular_rendimientos_finales()
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
            self.df_acumulado['rendimiento_normalizado'] = self.df_acumulado['masa_rend_seco'] * coeficiente_mapa_referencia

            # Actualizar la base de datos para el mapa de referencia
            for index, row in self.df_acumulado.iterrows():
                sync_to_async(CultivoData.objects.filter(id=row['id']).update)(
                                rendimiento_normalizado=row['rendimiento_normalizado']
                            )
        # Ajustar el mapa actual
        archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
        df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual].copy()
        df_mapa_actual['rendimiento_normalizado'] = df_mapa_actual['masa_rend_seco'] * coeficiente_mapa_actual

        # Actualizar la base de datos para el mapa actual
        for index, row in df_mapa_actual.iterrows():
            CultivoData.objects.filter(id=row['id']).update(rendimiento_normalizado=row['rendimiento_normalizado'])

        # Actualizar el DataFrame original
        self.df.loc[df_mapa_actual.index, 'rendimiento_normalizado'] = df_mapa_actual['rendimiento_normalizado']
        if self.df_acumulado is not None:
            self.df.loc[self.df_acumulado.index, 'rendimiento_normalizado'] = self.df_acumulado['rendimiento_normalizado']

        # Actualizar el DataFrame acumulado para incluir el mapa actual
        self.df_acumulado = pd.concat([self.df_acumulado, df_mapa_actual])

    # @database_sync_to_async
    # @transaction.atomic
    # async def aplicar_transaccion(self, coeficientes):
    #     """Aplica los coeficientes a ambos mapas y actualiza el DataFrame acumulado"""
    #     coeficiente_mapa_referencia = float(coeficientes.get('coeficiente_mapa_referencia', 1))
    #     coeficiente_mapa_actual = float(coeficientes.get('coeficiente_mapa_actual', 1))

    #     # Ajustar el mapa de referencia (acumulado)
    #     if self.df_acumulado is not None:
    #         self.df_acumulado['rendimiento_normalizado'] = self.df_acumulado['masa_rend_seco'] * coeficiente_mapa_referencia

    #         # Actualizar la base de datos para el mapa de referencia
    #         for index, row in self.df_acumulado.iterrows():
    #             CultivoData.objects.filter(id=row['id']).update(
    #                 rendimiento_normalizado=row['rendimiento_normalizado']
    #             )

    #     # Ajustar el mapa actual
    #     archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
    #     df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual].copy()
    #     df_mapa_actual['rendimiento_normalizado'] = df_mapa_actual['masa_rend_seco'] * coeficiente_mapa_actual

    #     # Actualizar la base de datos para el mapa actual
    #     for index, row in df_mapa_actual.iterrows():
    #         CultivoData.objects.filter(id=row['id']).update(
    #             rendimiento_normalizado=row['rendimiento_normalizado']
    #         )

    #     # Actualizar el DataFrame original
    #     self.df.loc[df_mapa_actual.index, 'rendimiento_normalizado'] = df_mapa_actual['rendimiento_normalizado']
    #     if self.df_acumulado is not None:
    #         self.df.loc[self.df_acumulado.index, 'rendimiento_normalizado'] = self.df_acumulado['rendimiento_normalizado']

    #     # Actualizar el DataFrame acumulado para incluir el mapa actual
    #     self.df_acumulado = pd.concat([self.df_acumulado, df_mapa_actual])






    @sync_to_async
    def calcular_rendimientos_finales(self):
        """Calcula rendimiento_relativo y rendimiento_real para todos los registros al finalizar el proceso"""
        # Obtener el rendimiento promedio del cultivo
        cultivo = Cultivo.objects.get(id=self.cultivo_id)
        rinde_promedio_cultivo = cultivo.rinde_prom

        # Calcular la media de rendimiento_normalizado
        media_rendimiento_normalizado = self.df['rendimiento_normalizado'].mean()

        if media_rendimiento_normalizado == 0 or pd.isna(media_rendimiento_normalizado):
            media_rendimiento_normalizado = 1  # Evitar división por cero

        # Calcular rendimiento_relativo y rendimiento_real
        self.df['rendimiento_relativo'] = self.df['rendimiento_normalizado'] / media_rendimiento_normalizado
        self.df['rendimiento_real'] = self.df['rendimiento_relativo'] * rinde_promedio_cultivo

        # Actualizar la base de datos para todos los registros en lotes
        updated_instances = []
        for index, row in self.df.iterrows():
            instance = CultivoData(
                id=row['id'],
                rendimiento_relativo=row['rendimiento_relativo'],
                rendimiento_real=row['rendimiento_real']
            )
            updated_instances.append(instance)

        # Procesar las actualizaciones en lotes más pequeños
        batch_size = 1000  # Ajusta este valor según tus necesidades y recursos del servidor
        total_instances = len(updated_instances)
        logger.info(f"Actualizando {total_instances} registros en lotes de {batch_size}")

        for i in range(0, total_instances, batch_size):
            batch = updated_instances[i:i + batch_size]
            with transaction.atomic():
                CultivoData.objects.bulk_update(batch, ['rendimiento_relativo', 'rendimiento_real'])
            logger.info(f"Lote {i // batch_size + 1} actualizado exitosamente.")

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
                'velocidad', 'fecha', 'rendimiento_real', 'rendimiento_relativo', 'rendimiento_normalizado', 'nombre_archivo_csv'
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

            if self.current_pair_index == 0:
                # Para el primer par, tanto la referencia como el actual usan 'masa_rend_seco'
                df_referencia = self.df_acumulado
                campo_referencia = 'masa_rend_seco'
            else:
                # A partir del segundo par, la referencia usa 'rendimiento_normalizado'
                df_referencia = self.df_acumulado
                campo_referencia = 'rendimiento_normalizado'
              # Calcular percentil 80 para el campo de referencia y el campo actual (siempre 'masa_rend_seco')
            percentil_80_referencia = df_referencia[campo_referencia].quantile(0.8)
            percentil_80_actual = df_mapa_actual['masa_rend_seco'].quantile(0.8)

            # Calcular coeficiente sugerido comparando ambos mapas
            coeficiente_sugerido = self.calcular_coeficiente_sugerido(self.df_acumulado, df_mapa_actual)

            # Calcular la variación entre los percentiles 80 de ambos mapas
            variacion_percentil = abs(coeficiente_sugerido - 1)  # Variación en porcentaje respecto a 1 (sin ajuste)

            if variacion_percentil <= (self.variacion_admitida / 100):
                # Si la variación es menor o igual al 5%, unir automáticamente los mapas
                await self.aplicar_transaccion({
                    'coeficiente_mapa_referencia': 1,  # Usamos coeficiente 1 para la referencia
                    'coeficiente_mapa_actual': coeficiente_sugerido  # Ajustamos el mapa actual
                })
                # Actualizar el DataFrame acumulado automáticamente
                self.df_acumulado = pd.concat([self.df_acumulado, df_mapa_actual])
###
                # Actualizar la base de datos incluso si no hay interacción del usuario
                for index, row in self.df_acumulado.iterrows():
                    await sync_to_async(CultivoData.objects.filter(id=row['id']).update)(
                        rendimiento_normalizado=row['rendimiento_normalizado']
                    )
                logger.info(f"Actualización completada para id: {row['id']}")
    
###
                self.current_pair_index += 1  # Avanzar al siguiente mapa
                await self.enviar_nuevos_mapas()  # Llamamos de nuevo para procesar el siguiente par

            else:
                # Si la variación es mayor al 5%, se pide confirmación del usuario
                mapa_referencia_geojson = await self.serializar_geojson(self.df_acumulado)
                mapa_actual_geojson = await self.serializar_geojson(df_mapa_actual)

                # Enviar los mapas y coeficiente sugerido al cliente para que confirme
                await self.send(text_data=json.dumps({
                    'action': 'nuevos_mapas',
                    'mapa_referencia': mapa_referencia_geojson,
                    'mapa_actual': mapa_actual_geojson,
                    'coeficiente_sugerido_referencia': 1,  # Coeficiente de referencia se mantiene en 1
                    'coeficiente_sugerido_actual': coeficiente_sugerido,  # Coeficiente sugerido para ajuste
                    'percentil_80_referencia': percentil_80_referencia,
                    'percentil_80_actual': percentil_80_actual,
                    'current_pair_index': self.current_pair_index
                }))
        else:
            # Proceso completado
            await self.send(text_data=json.dumps({
                'action': 'proceso_completado'
            }))



    #async def enviar_nuevos_mapas(self):
        if self.current_pair_index < len(self.archivos_unicos) - 1:
            archivo_mapa_actual = self.archivos_unicos[self.current_pair_index + 1]
            df_mapa_actual = self.df[self.df['nombre_archivo_csv'] == archivo_mapa_actual]

            # Calcular coeficiente sugerido comparando percentil 80 del mapa de referencia y del mapa actual
            coeficiente_sugerido = self.calcular_coeficiente_sugerido(self.df_acumulado, df_mapa_actual)

            # Si la variación es mayor que la admitida, mandamos el coeficiente al frontend
            variacion_percentil = abs(1 - coeficiente_sugerido)

            if variacion_percentil > self.variacion_admitida:
                # Obtener GeoJSON de los mapas
                mapa_referencia_geojson = await self.serializar_geojson(self.df_acumulado)
                mapa_actual_geojson = await self.serializar_geojson(df_mapa_actual)

                # Enviar los mapas y coeficientes sugeridos al cliente
                await self.send(text_data=json.dumps({
                    'action': 'nuevos_mapas',
                    'mapa_referencia': mapa_referencia_geojson,
                    'mapa_actual': mapa_actual_geojson,
                    'coeficiente_sugerido_referencia': 1,  # El mapa de referencia no necesita ajuste
                    'coeficiente_sugerido_actual': coeficiente_sugerido,
                    'current_pair_index': self.current_pair_index
                }))

    def calcular_coeficiente_sugerido(self, df_mapa_referencia, df_mapa_actual):
        """
        Calcula el coeficiente sugerido comparando los percentiles 80 de ambos mapas.
        Si el percentil del mapa actual es menor que el del mapa de referencia, el coeficiente será mayor a 1.
        """
        # Obtenemos el percentil 80 de ambos mapas
        percentil_80_referencia = df_mapa_referencia['masa_rend_seco'].quantile(0.8)
        percentil_80_actual = df_mapa_actual['masa_rend_seco'].quantile(0.8)
        
        # Asegurarse de que no hay división por cero
        if percentil_80_actual > 0:
            coeficiente_sugerido = percentil_80_referencia / percentil_80_actual
        else:
            coeficiente_sugerido = 1  # Devolvemos 1 si el percentil 80 del mapa actual es 0

        return coeficiente_sugerido



    async def serializar_geojson(self, df):
        mapa_ids = df['id'].tolist()
        queryset_mapa = await sync_to_async(list)(CultivoData.objects.filter(id__in=mapa_ids))
        geojson_mapa = await sync_to_async(serialize)(
            'geojson',
            queryset_mapa,
            geometry_field='punto_geografico',
            fields=[
                'anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 'fecha',
                'rendimiento_normalizado', 'rendimiento_relativo', 'rendimiento_real'
            ]
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
