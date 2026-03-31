# Build stage
FROM node:20-alpine AS build

# Install git to allow build tools to capture commit information
RUN apk add --no-cache git

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built assets and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/src/constants.ts ./src/constants.ts

# Create data directory for persistence
RUN mkdir -p data

EXPOSE 3000

# Start the server
CMD ["npm", "start"]
