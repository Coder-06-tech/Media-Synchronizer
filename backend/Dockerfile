# Production Runtime: Node.js
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (Copying package.json first for caching)
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Environment Defaults
ENV PORT=5000
ENV NODE_ENV=production

# Expose the API and WebSocket port
EXPOSE 5000

# Start Engine
CMD [ "node", "server.js" ]
