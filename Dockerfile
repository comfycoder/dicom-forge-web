# DICOM Forge UI — build the SPA and serve it with nginx
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Baked into the bundle at build time; overridable in the app's Settings at runtime.
ARG VITE_API_URL=http://localhost:8472
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
