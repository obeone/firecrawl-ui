# Dockerfile for the FireCrawl UI application.
# This file defines the multi-stage build process for the application,
# separating the build environment from the runtime environment to create
# a lean and secure final image.

# Stage 1: Build the application
# Uses a Node.js image to install dependencies and build the Vue.js application.
# Keep the major version in sync with .nvmrc and package.json "engines".
FROM node:26-slim AS build

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
# for npm ci.
COPY --link package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application source code and build it.
# APP_VERSION is shown on the About page; CI sets it from git describe,
# since .git is not part of the build context.
COPY --link . .
ARG APP_VERSION=dev
RUN APP_VERSION="${APP_VERSION}" npm run build

# Stage 2: Serve the application with Nginx
# Uses a non-root Nginx image to serve the static files generated in the build stage.
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy the built application files from the 'build' stage to Nginx's HTML directory.
COPY --from=build /app/dist /usr/share/nginx/html
# Copy the custom Nginx configuration file.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080, which Nginx is configured to listen on.
EXPOSE 8080

# Command to run Nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
