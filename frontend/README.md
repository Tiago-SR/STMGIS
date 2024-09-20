Hoy seguimos el camino facil, para crear nuevos componentes, se hará de la siguiente manera.

Tener instalado `node`, y de manera recomendada la version >= 20 e instalado `npm` en su version >= 10

Para instalar `nvm`
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
Para instalar `node`
    nvm install 20

Asegurate que estas usando la version 20 con el siguiente comando
    nvm ls

Estando situados en la carpeta `frontend` ejecutamos el siguiente comando
    npm install -g @angular/cli

Luego de instalado el `angular cli` instalars las dependencias de manera local con:
    npm i