# Image du back-office : build Vite, puis nginx sans root.
#
#   docker build -t web-backoffice .
#   docker run --rm -p 8080:8080 web-backoffice
#
# Par defaut, l'application vise Keycloak et la gateway sur le meme hote qu'elle
# (/auth et /), comme derriere l'Ingress du cluster : une seule image pour tout hote public.

FROM node:22.18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/
ARG VITE_KEYCLOAK_URL=/auth
ARG VITE_KEYCLOAK_REALM=ecommerce
ARG VITE_KEYCLOAK_CLIENT_ID=web-bo
ENV VITE_API_URL=$VITE_API_URL \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
RUN npm run build

# Utilisateur nginx (uid 101), port 8080, fichiers temporaires dans /tmp : le systeme de
# fichiers peut etre en lecture seule.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
