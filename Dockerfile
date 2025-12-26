# Use Node.js LTS (Long Term Support) Alpine version for a small footprint
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
# Install dependencies
RUN npm ci
COPY frontend/ ./
# Build the frontend (Vite builds to dist/ by default)
RUN npm run build

# --- Final Stage ---
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache openssl ffmpeg

# Copy backend package files
COPY package.json ./

# Install backend dependencies
RUN npm install --omit=dev

# Copy the backend code
COPY src ./src
COPY entrypoint.sh ./entrypoint.sh

# Copy the frontend build from the builder stage to public/
COPY --from=frontend-builder /frontend/dist ./public

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Create the downloads directory
RUN mkdir -p /downloads

# Expose the API port
EXPOSE 2096

# Volume configuration
VOLUME ["/downloads", "/app/data", "/app/certs"]

# Start the application using the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
