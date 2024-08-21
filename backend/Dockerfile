# Usa una imagen base de Python
FROM python:3.11-slim

RUN pip3 install --upgrade pip

# Establece el directorio de trabajo en el contenedor
WORKDIR /app

# Copia el archivo de requerimientos al contenedor
COPY requirements.txt /app/

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código de la aplicación al contenedor
COPY . /app/

# Expone el puerto que usará Django
EXPOSE 80

# Comando para iniciar el servidor de desarrollo de Django con modo debug
#CMD ["python", "manage.py", "runserver", "0.0.0.0:80"]
ENTRYPOINT ["./wait-for-it.sh", "db:5432", "--", "python", "manage.py", "runserver", "0.0.0.0:00"]
