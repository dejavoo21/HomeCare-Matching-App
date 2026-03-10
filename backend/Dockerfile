# Build stage (backend only; frontend can be a separate Railway service)
FROM node:18-alpine AS builder

WORKDIR /app

# bcrypt may need to compile from source on alpine, so install node-gyp deps.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Production dependency install can also compile bcrypt if prebuilt binaries
# are unavailable for the current target.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/migrations ./src/migrations

EXPOSE 8000

CMD ["node", "dist/index.js"]
