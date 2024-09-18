# Usa una imagen base oficial de Python
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y binutils libproj-dev gdal-bin \
    && apt-get install -y software-properties-common \
    && apt-get install -y libgeos++-dev \
    && apt-get install -y proj-bin \
    && apt-get install -y gdal-bin \
    && apt-get install -y libgdal-dev

# Establece el directorio de trabajo en /app
WORKDIR /usr/src/app

# Copia el archivo requirements.txt al contenedor
COPY requirements.txt /usr/src/app/

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto de los archivos del proyecto al contenedor
COPY . /usr/src/app/

# Copia el script wait-for-it.sh al contenedor
COPY ./wait-for-it.sh /usr/src/app/wait-for-it.sh

# Dale permisos de ejecución al script
RUN chmod +x /usr/src/app/wait-for-it.sh

# Crea un usuario no root
RUN useradd -ms /bin/bash

# Cambia a ese usuario
USER myuser

# Expone el puerto en el que correrá la aplicación
EXPOSE 8000

# Corre las migraciones y luego ejecuta el servidor de Django
CMD ["sh", "-c", "/usr/src/app/wait-for-it.sh db:5432 -- python manage.py runserver 0.0.0.0:8000"]

#