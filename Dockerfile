# Build stage using Node.js
FROM node:24-slim AS build

WORKDIR /app

COPY --link package.json package-lock.json ./
RUN npm install

COPY --link . .
RUN npm run build

# Runtime stage using a non-root Nginx image
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
