FROM node:18-alpine AS builder

WORKDIR /app

# bcrypt falls back to native compilation on musl/alpine when the prebuilt
# archive is unavailable, so the build image needs node-gyp prerequisites.
RUN apk add --no-cache python3 make g++

# Install deps for backend and frontend first for better cache reuse
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install
RUN cd frontend && npm install

# Copy full source
COPY backend ./backend
COPY frontend ./frontend

# Build backend (TypeScript -> dist)
RUN cd backend && npm run build

# Build frontend (Vite -> dist)
RUN cd frontend && npm run build

FROM node:18-alpine AS runtime

WORKDIR /app

# The runtime stage performs a production npm install, which can also trigger
# a bcrypt source build on alpine.
RUN apk add --no-cache python3 make g++

# Install backend runtime deps only
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend build output
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/src/migrations ./src/migrations

# Copy frontend build output to path expected by backend/src/index.ts
COPY --from=builder /app/frontend/dist ./public

# Fail build early if SPA artifact is missing
RUN test -f /app/public/index.html

EXPOSE 8000

CMD ["node", "dist/index.js"]
