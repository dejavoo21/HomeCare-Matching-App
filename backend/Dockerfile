# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies for backend
WORKDIR /app/backend
RUN npm install

# Build backend
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built backend application from builder stage
COPY --from=builder /app/backend/dist ./dist

# Copy built frontend from builder stage (for serving as static files)
COPY --from=builder /app/frontend/dist ./public

# Expose port
EXPOSE 8000

# Health check
CMD ["node", "dist/index.js"]
