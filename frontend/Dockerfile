# Use official node image as the base image
FROM node:lts as build

ADD ./package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /usr/local/app && cp -a /tmp/node_modules /usr/local/app/

WORKDIR /usr/local/app

# Add the source code from the app to the container
COPY ./ /usr/local/app/

# Generate the build of the application
RUN npm run build --prod --optimization

# Stage 2: Serve app with nginx server
# Use official nginx image as the base image
FROM nginx:latest

# Copy the build output to replace the default nginx contents.
# COPY --from=build /usr/local/app/dist/build/browser /usr/share/nginx/html
COPY --from=build /usr/local/app/dist/my-app/browser /usr/share/nginx/html

# Copy the nginx conf that we created to the container
COPY ./frontend.nginx.conf  /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80