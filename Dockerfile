# Dockerfile for the FireCrawl UI application.
# This file defines the multi-stage build process for the application,
# separating the build environment from the runtime environment to create
# a lean and secure final image.

# Stage 1: Build the application
# Uses a Node.js image to install dependencies and build the Vue.js application.
FROM node:24-slim AS build

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
# for npm install.
COPY --link package.json package-lock.json ./
RUN npm install

# Copy the rest of the application source code and build it.
COPY --link . .
RUN npm run build

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
