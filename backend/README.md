Para crear nuevas 'apps' de Django debemos instalar localmente django y ejecutar sus comandos( sino obtendremos errores de permisos )

Para esto debemos crear el entorno virtual de python en la carpeta `backend`:

`python -m venv venv`

Con eso crearemos un entorno virtual llamado `venv`

Procedemos a activar dicho entorno virtual:

`source venv/bin/activate` 

Con eso deberia aparecernos `(venv)` al comienzo de nuestra linea de comandos.

Y finalmente para instalar django hacemos:

`pip install -r requirements.txt`

Con el siguiente comando se crean las 'apps':

`python manage.py startapp <app_name>`