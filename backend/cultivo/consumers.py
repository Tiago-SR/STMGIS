from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.db import transaction
from django.core.serializers import serialize
from django.db.models import F, Value, QuerySet, Avg
from django.db.models.functions import Cast
from cultivo.models import Cultivo, CultivoData
import json
import logging

logger = logging.getLogger(__name__)

class RendimientoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.cultivo_id = self.scope['url_route']['kwargs']['cultivo_id']
        self.group_name = f"rendimiento_{self.cultivo_id}"
        self.current_pair_index = 0
        self.acumulado_mapas_ids = []
        self.coeficiente_actual = 1
        self.normalized_pairs = []  # Track which pairs have been normalized

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket conectado para cultivo_id: {self.cultivo_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket desconectado para cultivo_id: {self.cultivo_id}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'iniciar_proceso':
            await self.iniciar_proceso()
        elif action == 'enviar_coeficientes':
            coeficientes = data.get('coeficientes')
            await self.procesar_coeficientes(coeficientes)
        elif action == 'actualizar_coeficiente_ajuste':
            coeficiente = data.get('coeficiente')
            await self.procesar_coeficiente_actualizado(coeficiente)
        elif action == 'cancelar_proceso':
            await self.cancelar_proceso()

    async def iniciar_proceso(self):
        logger.info("Iniciando proceso de normalización")
        
        result = await self._get_mapas_cultivo()
        if result is None:
            await self.send(text_data=json.dumps({
                'action': 'error',
                'message': 'No hay mapas de rendimiento suficientes para el cultivo.'
            }))
            return

        self.queryset_base, self.archivos_unicos = result
        self.current_pair_index = 0
        self.normalized_pairs = []
        
        # Enviar los dos primeros mapas
        if len(self.archivos_unicos) >= 2:
            archivo_mapa1 = self.archivos_unicos[0]
            archivo_mapa2 = self.archivos_unicos[1]
            
            puntos_mapa1 = await self._get_puntos_por_archivo(archivo_mapa1)
            puntos_mapa2 = await self._get_puntos_por_archivo(archivo_mapa2)

            mapa1_geojson = await self._serializar_geojson(puntos_mapa1)
            mapa2_geojson = await self._serializar_geojson(puntos_mapa2)

            # Calcular percentiles y coeficiente sugerido
            puntos_mapa1_list = await self._queryset_to_list(puntos_mapa1)
            puntos_mapa2_list = await self._queryset_to_list(puntos_mapa2)

            # Calcular valores para el primer mapa
            valores_mapa1 = [float(p.masa_rend_seco) for p in puntos_mapa1_list 
                           if p.masa_rend_seco is not None]
            
            # Calcular valores para el segundo mapa
            valores_mapa2 = [float(p.masa_rend_seco) for p in puntos_mapa2_list 
                           if p.masa_rend_seco is not None]

            # Calcular percentiles
            percentil_80_mapa1 = self.calcular_percentil_80(valores_mapa1)
            percentil_80_mapa2 = self.calcular_percentil_80(valores_mapa2)

            # Calcular coeficiente sugerido
            coeficiente_sugerido = (percentil_80_mapa1 / percentil_80_mapa2) if percentil_80_mapa2 > 0 else 1

            logger.info(f"Percentil 80 mapa 1: {percentil_80_mapa1}")
            logger.info(f"Percentil 80 mapa 2: {percentil_80_mapa2}")
            logger.info(f"Coeficiente sugerido inicial: {coeficiente_sugerido}")

            await self.send(text_data=json.dumps({
                'action': 'nuevos_mapas',
                'mapa_referencia': mapa1_geojson,
                'mapa_actual': mapa2_geojson,
                'coeficiente_sugerido_referencia': 1,
                'coeficiente_sugerido_actual': coeficiente_sugerido,
                'percentil_80_referencia': percentil_80_mapa1,
                'percentil_80_actual': percentil_80_mapa2,
                'current_pair_index': self.current_pair_index
            }))
        else:
            await self.send(text_data=json.dumps({
                'action': 'error',
                'message': 'Se necesitan al menos dos mapas para iniciar el proceso.'
            }))

    @sync_to_async
    def _get_mapas_cultivo(self):
        try:
            cultivo = Cultivo.objects.get(id=self.cultivo_id)
            queryset_base = CultivoData.objects.filter(cultivo=cultivo)
            
            if not queryset_base.exists():
                logger.warning(f"No hay mapas de rendimiento para el cultivo con id {self.cultivo_id}.")
                return None

            archivos_unicos = list(
                queryset_base.values_list('nombre_archivo_csv', flat=True)
                .distinct()
                .order_by('nombre_archivo_csv')
            )
            
            logger.info(f"Archivos únicos obtenidos: {len(archivos_unicos)}")
            return queryset_base, archivos_unicos

        except Exception as e:
            logger.error(f"Error al obtener archivos: {str(e)}")
            return None

    @sync_to_async
    def _get_puntos_por_archivo(self, archivo_nombre, coeficiente=None):
        """Obtiene los puntos de un archivo específico"""
        try:
            query = CultivoData.objects.filter(
                nombre_archivo_csv=archivo_nombre,
                cultivo_id=self.cultivo_id,
                masa_rend_seco__isnull=False  # Asegurar que tengan valor de rendimiento
            )
            
            if coeficiente is not None:
                query = query.annotate(
                    rendimiento_normalizado_calc=F('masa_rend_seco') * Value(float(coeficiente))
                )
                
            return query
            
        except Exception as e:
            logger.error(f"Error obteniendo puntos por archivo: {str(e)}")
            return CultivoData.objects.none()

    @sync_to_async
    def _get_puntos_normalizados(self):
        """Obtiene los puntos ya normalizados para el acumulado"""
        try:
            return CultivoData.objects.filter(
                cultivo_id=self.cultivo_id,
                nombre_archivo_csv__in=self.normalized_pairs,
                rendimiento_normalizado__isnull=False
            )
        except Exception as e:
            logger.error(f"Error obteniendo puntos normalizados: {str(e)}")
            return CultivoData.objects.none()

    @sync_to_async
    def _queryset_to_list(self, queryset):
        return list(queryset)

    def calcular_percentil_80(self, valores):
        try:
            if not valores:
                logger.warning("Lista de valores vacía para cálculo de percentil")
                return 0
                
            # Filtrar valores nulos o no numéricos
            valores_validos = [float(v) for v in valores if v is not None and str(v).strip()]
            
            if not valores_validos:
                logger.warning("No hay valores válidos para calcular el percentil")
                return 0
                
            valores_ordenados = sorted(valores_validos)
            indice = int(len(valores_ordenados) * 0.8)
            
            # Asegurar que el índice sea válido
            if indice >= len(valores_ordenados):
                indice = len(valores_ordenados) - 1
                
            percentil = valores_ordenados[indice]
            logger.info(f"Percentil 80 calculado: {percentil} de {len(valores_ordenados)} valores")
            return percentil
            
        except Exception as e:
            logger.error(f"Error calculando percentil 80: {str(e)}")
            return 0

    @sync_to_async
    def _serializar_geojson(self, queryset):
        return json.loads(serialize(
            'geojson',
            queryset,
            geometry_field='punto_geografico',
            fields=[
                'anch_fja', 'humedad', 'masa_rend_seco', 'velocidad', 
                'fecha', 'rendimiento_normalizado'
            ]
        ))

    async def procesar_coeficientes(self, coeficientes):
        # Aplicar coeficientes y normalizar los dos primeros mapas
        if self.current_pair_index == 0:
            await self._normalizar_primeros_mapas(coeficientes)
            self.current_pair_index += 1
            await self.enviar_siguiente_mapa()
        else:
            await self._normalizar_siguiente_mapa(coeficientes)
            self.current_pair_index += 1
            await self.enviar_siguiente_mapa()

    @sync_to_async
    def _normalizar_primeros_mapas(self, coeficientes):
        with transaction.atomic():
            logger.info("Normalizando primeros mapas")
            coef_mapa1 = float(coeficientes.get('coeficiente_mapa_referencia', 1))
            coef_mapa2 = float(coeficientes.get('coeficiente_mapa_actual', 1))
            
            # Normalizar primer mapa
            puntos_actualizados = CultivoData.objects.filter(
                cultivo_id=self.cultivo_id,
                nombre_archivo_csv=self.archivos_unicos[0]
            ).update(
                rendimiento_normalizado=F('masa_rend_seco') * coef_mapa1
            )
            logger.info(f"Puntos actualizados mapa 1: {puntos_actualizados}")
            
            # Normalizar segundo mapa
            puntos_actualizados = CultivoData.objects.filter(
                cultivo_id=self.cultivo_id,
                nombre_archivo_csv=self.archivos_unicos[1]
            ).update(
                rendimiento_normalizado=F('masa_rend_seco') * coef_mapa2
            )
            logger.info(f"Puntos actualizados mapa 2: {puntos_actualizados}")
            
            # Registrar los archivos normalizados
            self.normalized_pairs = [self.archivos_unicos[0], self.archivos_unicos[1]]
            logger.info(f"Archivos normalizados: {self.normalized_pairs}")

    @sync_to_async
    def _normalizar_siguiente_mapa(self, coeficientes):
        with transaction.atomic():
            logger.info("Normalizando siguiente mapa")
            coef_actual = float(coeficientes.get('coeficiente_mapa_actual', 1))
            archivo_actual = self.archivos_unicos[self.current_pair_index + 1]
            
            # Normalizar el mapa actual
            puntos_actualizados = CultivoData.objects.filter(
                cultivo_id=self.cultivo_id,
                nombre_archivo_csv=archivo_actual
            ).update(
                rendimiento_normalizado=F('masa_rend_seco') * coef_actual
            )
            logger.info(f"Puntos actualizados: {puntos_actualizados}")
            
            # Agregar a la lista de normalizados
            self.normalized_pairs.append(archivo_actual)
            logger.info(f"Archivos normalizados actualizados: {self.normalized_pairs}")

    async def enviar_siguiente_mapa(self):
            if self.current_pair_index >= len(self.archivos_unicos) - 1:
                await self._calcular_rendimientos_finales()
                await self.send(text_data=json.dumps({
                    'action': 'proceso_completado',
                    'message': 'Proceso de normalización y cálculo de rendimientos completado.'
                    }))
                return

            # Obtener el acumulado (mapas ya normalizados)
            puntos_acumulados = await self._get_puntos_normalizados()
            
            # Obtener el siguiente mapa (con masa_rend_seco)
            archivo_siguiente = self.archivos_unicos[self.current_pair_index + 1]
            puntos_siguiente = await self._get_puntos_por_archivo(archivo_siguiente)

            # Calcular percentiles y coeficiente sugerido
            puntos_acumulados_list = await self._queryset_to_list(puntos_acumulados)
            puntos_siguiente_list = await self._queryset_to_list(puntos_siguiente)
            
            # Calcular valores de referencia usando rendimiento_normalizado
            valores_referencia = []
            for p in puntos_acumulados_list:
                if p.rendimiento_normalizado is not None:
                    valores_referencia.append(float(p.rendimiento_normalizado))
            
            # Calcular valores actuales usando masa_rend_seco
            valores_actual = [float(p.masa_rend_seco) for p in puntos_siguiente_list 
                            if p.masa_rend_seco is not None]

            # Calcular percentiles
            percentil_80_referencia = self.calcular_percentil_80(valores_referencia)
            percentil_80_actual = self.calcular_percentil_80(valores_actual)
            
            # Calcular coeficiente sugerido
            if percentil_80_actual > 0:
                coeficiente_sugerido = percentil_80_referencia / percentil_80_actual
            else:
                coeficiente_sugerido = 1

            logger.info(f"Enviando mapa acumulado con {len(valores_referencia)} puntos")
            logger.info(f"Enviando mapa siguiente con {len(valores_actual)} puntos")
            logger.info(f"Percentil 80 referencia: {percentil_80_referencia}")
            logger.info(f"Percentil 80 actual: {percentil_80_actual}")
            logger.info(f"Coeficiente sugerido: {coeficiente_sugerido}")

            # Serializar y enviar
            acumulado_geojson = await self._serializar_geojson(puntos_acumulados)
            siguiente_geojson = await self._serializar_geojson(puntos_siguiente)

            await self.send(text_data=json.dumps({
                'action': 'nuevos_mapas',
                'mapa_referencia': acumulado_geojson,
                'mapa_actual': siguiente_geojson,
                'coeficiente_sugerido_referencia': 1,
                'coeficiente_sugerido_actual': coeficiente_sugerido,
                'percentil_80_referencia': percentil_80_referencia,
                'percentil_80_actual': percentil_80_actual,
                'current_pair_index': self.current_pair_index
            }))
    @sync_to_async
    def _calcular_rendimientos_finales(self):
        """Calcula rendimiento_relativo y rendimiento_real para todos los registros normalizados"""
        try:
            logger.info("Iniciando cálculo de rendimientos finales")
            
            with transaction.atomic():
                # Obtener el rendimiento promedio del cultivo
                cultivo = Cultivo.objects.get(id=self.cultivo_id)
                rinde_promedio_cultivo = cultivo.rinde_prom
                logger.info(f"Rinde promedio del cultivo: {rinde_promedio_cultivo}")

                # Obtener la media de rendimiento_normalizado de todos los puntos normalizados
                puntos = CultivoData.objects.filter(
                    cultivo_id=self.cultivo_id,
                    rendimiento_normalizado__isnull=False
                )
                
                media_rendimiento = puntos.aggregate(
                    media=Avg('rendimiento_normalizado')
                )['media'] or 1

                logger.info(f"Media de rendimiento normalizado: {media_rendimiento}")

                # Actualizar todos los puntos en un solo query
                puntos_actualizados = puntos.update(
                    rendimiento_relativo=F('rendimiento_normalizado') / Value(media_rendimiento),
                    rendimiento_real=F('rendimiento_normalizado') / Value(media_rendimiento) * Value(rinde_promedio_cultivo)
                )

                logger.info(f"Puntos actualizados con rendimientos finales: {puntos_actualizados}")
                return puntos_actualizados

        except Exception as e:
            logger.error(f"Error calculando rendimientos finales: {str(e)}")
            raise