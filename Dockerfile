# Stage 1: Builder
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install ALL dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Stage 2: Runner
FROM node:22-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist   
COPY --from=builder /app/src ./src     

# Switch to non-root user
USER appuser

EXPOSE 5000
ENV NODE_ENV=production

# Start app in production
CMD ["npm", "run", "start"]
