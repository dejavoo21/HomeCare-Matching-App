# Build stage  
FROM node:18-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY index.html ./

RUN npm install
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install a simple static file server
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Health check  
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
