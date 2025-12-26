# Use Node.js LTS (Long Term Support) Alpine version for a small footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json ./

# Install dependencies (using install instead of ci because package-lock.json might not exist yet in dev)
RUN npm install --omit=dev

# Copy the rest of the application code
COPY src ./src

# Create the downloads directory
RUN mkdir -p /downloads

# Expose the API port
EXPOSE 3000

# Volume configuration is usually done in docker-compose, but we can declare it here for documentation
VOLUME ["/downloads"]

# Start the application
CMD ["npm", "start"]
