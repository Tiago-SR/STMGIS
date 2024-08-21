FROM node:18-alpine

WORKDIR /app

# Instala Angular CLI globalmente
RUN npm install -g @angular/cli

# Copia package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto
EXPOSE 80

# Comando por defecto
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "80"]
