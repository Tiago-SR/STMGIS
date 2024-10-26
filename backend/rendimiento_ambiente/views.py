# views.py
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Avg, StdDev
from django.http import HttpResponse
import pandas as pd
from datetime import datetime
from io import BytesIO
from .serializers import RendimientoAmbienteSerializer
from cultivo.models import Cultivo, CultivoData
from .models import RendimientoAmbiente
from ambientes.models import  Ambiente

class RendimientoAmbienteView(viewsets.ModelViewSet):
    queryset = RendimientoAmbiente.objects.all()
    serializer_class = RendimientoAmbienteSerializer

    @action(detail=True, methods=['get'], url_path='calcular-rendimiento')
    def calcular_rendimiento(self, request, pk=None):
        try:
            # Get the cultivo object
            cultivo = get_object_or_404(Cultivo, pk=pk)
            
            print(f"Encontrado cultivo con ID: {cultivo.id}")

            # Get all CultivoData points for this cultivo
            puntos_cultivo = CultivoData.objects.filter(
                cultivo=cultivo,
                rendimiento_real__isnull=False  # Ensure we only get points with valid yield data
            )

            if not puntos_cultivo.exists():
                return Response(
                    {'detail': 'No se encontraron puntos de rendimiento válidos.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get all active ambientes
            ambientes = Ambiente.objects.filter(is_active=True)
            
            resultados = []
            
            # Process each ambiente
            for ambiente in ambientes:
                # Find all points that fall within this ambiente's geometry
                puntos_en_ambiente = puntos_cultivo.filter(
                    punto_geografico__intersects=ambiente.ambiente_geom
                )
                
                if puntos_en_ambiente.exists():
                    # Calculate statistics
                    stats = puntos_en_ambiente.aggregate(
                        rendimiento_real_promedio=Avg('rendimiento_real'),
                        rendimiento_relativo_promedio=Avg('rendimiento_relativo'),
                        std_dev_real=StdDev('rendimiento_real'),
                        std_dev_relativo=StdDev('rendimiento_relativo')
                    )
                    
                    # Calculate coefficient of variation (CV = std_dev / mean)
                    coef_variacion_real = (
                        stats['std_dev_real'] / stats['rendimiento_real_promedio'] 
                        if stats['rendimiento_real_promedio'] else 0
                    )
                    coef_variacion_relativo = (
                        stats['std_dev_relativo'] / stats['rendimiento_relativo_promedio']
                        if stats['rendimiento_relativo_promedio'] else 0
                    )
                    
                    # Create or update RendimientoAmbiente record
                    rendimiento_ambiente, created = RendimientoAmbiente.objects.update_or_create(
                        cultivo=cultivo,
                        ambiente_id=ambiente.id,  # Added ambiente_id to make it unique per ambiente
                        defaults={
                            'rendimiento_real_promedio': stats['rendimiento_real_promedio'],
                            'rendimiento_relativo_promedio': stats['rendimiento_relativo_promedio'],
                            'coef_variacion_real': coef_variacion_real,
                            'coef_variacion_relativo': coef_variacion_relativo,
                        }
                    )
                    
                    # Add to results
                    resultados.append({
                        'ambiente_id': ambiente.idA,
                        'nombre_ambiente': ambiente.name,
                        'area_ambiente': ambiente.area,
                        'rendimiento_real_promedio': round(stats['rendimiento_real_promedio'], 2),
                        'rendimiento_relativo_promedio': round(stats['rendimiento_relativo_promedio'], 2),
                        'desviacion_estandar_real': round(stats['std_dev_real'], 2),
                        'desviacion_estandar_relativo': round(stats['std_dev_relativo'], 2),
                        'coef_variacion_real': round(coef_variacion_real * 100, 2),  # Convert to percentage
                        'coef_variacion_relativo': round(coef_variacion_relativo * 100, 2),  # Convert to percentage
                        'cantidad_puntos': puntos_en_ambiente.count()
                    })
            
            if not resultados:
                return Response(
                    {'detail': 'No se encontraron intersecciones entre puntos y ambientes.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            return Response({
                'cultivo_id': str(cultivo.id),
                'cultivo_nombre': cultivo.nombre,
                'fecha_calculo': datetime.now().strftime('%Y-%m-%d'),
                'resultados': resultados
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'detail': f'Error al calcular rendimientos: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='exportar-excel')
    def exportar_excel(self, request, pk=None):
        try:
            cultivo = get_object_or_404(Cultivo, pk=pk)
            
            # Obtener los resultados almacenados
            resultados_stored = RendimientoAmbiente.objects.filter(cultivo=cultivo)
            
            if not resultados_stored.exists():
                return Response(
                    {'detail': 'No se encontraron resultados almacenados para este cultivo.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Crear un DataFrame con los resultados
            ambientes = Ambiente.objects.filter(is_active=True)
            
            data = []
            for ambiente in ambientes:
                puntos_en_ambiente = CultivoData.objects.filter(
                    cultivo=cultivo,
                    punto_geografico__intersects=ambiente.ambiente_geom
                )
                
                if puntos_en_ambiente.exists():
                    stats = puntos_en_ambiente.aggregate(
                        rendimiento_real_promedio=Avg('rendimiento_real'),
                        rendimiento_relativo_promedio=Avg('rendimiento_relativo'),
                        std_dev_real=StdDev('rendimiento_real'),
                        std_dev_relativo=StdDev('rendimiento_relativo')
                    )
                    
                    coef_variacion_real = (
                        stats['std_dev_real'] / stats['rendimiento_real_promedio'] 
                        if stats['rendimiento_real_promedio'] else 0
                    )
                    coef_variacion_relativo = (
                        stats['std_dev_relativo'] / stats['rendimiento_relativo_promedio']
                        if stats['rendimiento_relativo_promedio'] else 0
                    )
                    
                    data.append({
                        'ID Ambiente': ambiente.idA,
                        'Nombre Ambiente': ambiente.name,
                        'Área (ha)': round(ambiente.area, 2) if ambiente.area else 0,
                        'Rendimiento Real Promedio': round(stats['rendimiento_real_promedio'], 2),
                        'Rendimiento Relativo Promedio': round(stats['rendimiento_relativo_promedio'], 2),
                        'Desviación Estándar Real': round(stats['std_dev_real'], 2),
                        'Desviación Estándar Relativo': round(stats['std_dev_relativo'], 2),
                        'Coeficiente Variación Real (%)': round(coef_variacion_real * 100, 2),
                        'Coeficiente Variación Relativo (%)': round(coef_variacion_relativo * 100, 2),
                        'Cantidad de Puntos': puntos_en_ambiente.count(),
                        'Sistema de Producción': ambiente.sist_prod,
                        'Zona': ambiente.zona,
                        'Tipo de Suelo': ambiente.tipo_suelo,
                        'Posición': ambiente.posicion,
                        'Profundidad': ambiente.prof,
                        'Restricción': ambiente.restriccion
                    })

            # Crear DataFrame
            df = pd.DataFrame(data)

            # Crear archivo Excel
            output = BytesIO()
            
            # Crear un ExcelWriter object
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                # Escribir el DataFrame en Excel
                df.to_excel(writer, sheet_name='Rendimientos por Ambiente', index=False)
                
                # Obtener el workbook y worksheet
                workbook = writer.book
                worksheet = writer.sheets['Rendimientos por Ambiente']
                
                
                # Definir formatos
                header_format = workbook.add_format({
                    'bold': True,
                    'bg_color': '#C0C0C0',
                    'border': 1
                })
                
                cell_format = workbook.add_format({
                    'border': 1
                })
                # Aplicar formatos
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                    # Ajustar el ancho de la columna al contenido
                    worksheet.set_column(col_num, col_num, len(str(value)) + 2)
                
                # Añadir información del cultivo
                info_sheet = workbook.add_worksheet('Información General')
                info_sheet.write(0, 0, 'Información del Cultivo', header_format)
                info_sheet.write(1, 0, 'Nombre del Cultivo:', cell_format)
                info_sheet.write(1, 1, cultivo.nombre, cell_format)
                info_sheet.write(2, 0, 'Campo:', cell_format)
                info_sheet.write(2, 1, cultivo.campo.nombre, cell_format)
                info_sheet.write(3, 0, 'Especie:', cell_format)
                info_sheet.write(3, 1, cultivo.especie.nombre, cell_format)
                info_sheet.write(4, 0, 'Superficie Total (ha):', cell_format)
                info_sheet.write(4, 1, cultivo.sup_total, cell_format)
                info_sheet.write(5, 0, 'Fecha de Exportación:', cell_format)
                info_sheet.write(5, 1, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), cell_format)

                writer.save()  # Asegúrate de llamar a save explícitamente

            with open("rendimiento_ambiente.xlsx", "wb") as f:
                f.write(output.getvalue())
            # Preparar la respuesta
            output.seek(0)
            
            # Crear el nombre del archivo
            filename = f"Rendimientos_{cultivo.nombre}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
            # Crear la respuesta HTTP
            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'detail': f'Error al exportar a Excel: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )