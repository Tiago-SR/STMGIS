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
import openpyxl


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
            # Get the cultivo object
            cultivo = get_object_or_404(Cultivo, pk=pk)
            
            # Prepare the data
            resultados = []
            ambientes = Ambiente.objects.filter(is_active=True)
            
            for ambiente in ambientes:
                resultado = RendimientoAmbiente.objects.filter(
                    cultivo=cultivo,
                    ambiente=ambiente
                ).first()
                
                if resultado:
                    resultados.append({
                        'Cultivo': cultivo.nombre,
                        'Rinde_promedio(ton/ha)': float(cultivo.rinde_prom),
                        'IDA': ambiente.idA,
                        'Nombre_Ambiente': ambiente.ambiente,
                        'Area_Ha': float(ambiente.area) if ambiente.area else 0,
                        'Rendimiento_Real': float(resultado.rendimiento_real_promedio),
                        'Rendimiento_Relativo': float(resultado.rendimiento_relativo_promedio),
                        'Coef_Variacion_Real': float(resultado.coef_variacion_real) * 100,
                        'Sistema_Produccion': str(ambiente.sist_prod),
                        'Zona': str(ambiente.zona),
                        'Tipo_Suelo': str(ambiente.tipo_suelo)
                    })

            if not resultados:
                return Response(
                    {'detail': 'No hay datos para exportar.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Create DataFrame
            df = pd.DataFrame(resultados)
            
            # Create the Excel file
            output = BytesIO()
            
            # Export to Excel
            df.to_excel(
                output, 
                sheet_name='Rendimientos',
                index=False,
                engine='xlsxwriter'
            )
                
            # Prepare the response
            output.seek(0)
            filename = f"rendimiento_ambiente_{cultivo.nombre}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
            
            # Modificamos los headers para asegurar la compatibilidad con nginx
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename*=UTF-8\'\'{filename}'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            response['X-Accel-Buffering'] = 'no'
            return response
            
        except Exception as e:
            print(f"Error en exportar_excel: {str(e)}")
            return Response(
                {'detail': f'Error al exportar a Excel: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )