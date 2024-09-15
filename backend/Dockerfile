# Usa una imagen base oficial de Python
FROM python:3.11-slim

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia el archivo requirements.txt al contenedor
COPY requirements.txt /app/

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto de los archivos del proyecto al contenedor
COPY . /app/

# Copia el script wait-for-it.sh al contenedor
COPY ./wait-for-it.sh /app/wait-for-it.sh

# Dale permisos de ejecución al script
RUN chmod +x /app/wait-for-it.sh

# Expone el puerto en el que correrá la aplicación
EXPOSE 8000

# Corre las migraciones y luego ejecuta el servidor de Django
CMD ["sh", "-c", "/app/wait-for-it.sh db:5432 -- python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
