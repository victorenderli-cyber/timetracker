# build stage
FROM node:20-alpine AS build

WORKDIR /app

# ARG para injetar a URL da API em build time (default: mesma origem, via nginx proxy)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# serve stage
FROM nginx:1.27-alpine

# BACKEND_URL default = endereço interno do docker-compose; Render sobrescreve via env
ENV BACKEND_URL=http://backend:8000

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# nginx:1.27-imagem oficial substitui os templates (envsubst) em /etc/nginx/templates
CMD ["nginx", "-g", "daemon off;"]