# Build stage using Node.js
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=optional

COPY . .
RUN npm run build

# Runtime stage using a non-root Nginx image
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

USER 1001

CMD ["nginx", "-g", "daemon off;"]
