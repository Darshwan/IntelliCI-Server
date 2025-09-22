FROM node:22-alpine

WORKDIR /build
RUN apk add --no-cache git python3 make g++

# Create non-root user
RUN addgroup -g 1001 -S builder && \
    adduser -u 1001 -S builder -G builder

USER builder