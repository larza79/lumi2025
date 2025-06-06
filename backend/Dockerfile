# Multi-stage, multi-architecture Dockerfile for Go backend
# Supports: linux/amd64, linux/arm64, linux/arm/v7

# ===========================================
# Build stage
# ===========================================
FROM golang:1.24.4-alpine AS builder

# Install necessary packages for cross-compilation
RUN apk add --no-cache \
    ca-certificates \
    git \
    tzdata

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN adduser -D -s /bin/sh -u 1001 appuser

# Copy go mod files first (for better layer caching)
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the application with optimizations
RUN go build \
    -a \
    -installsuffix cgo \
    -ldflags="-w -s -X 'github.com/larza79/lumi2025/internal/settings.Version=1.0.0' -X 'github.com/larza79/lumi2025/internal/settings.Commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)' -X 'github.com/larza79/lumi2025/internal/settings.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)'" \
    -o /app/bin/lumi-api \
    ./cmd/api

# Verify the binary exists and is executable
RUN ls -la /app/bin/lumi-api

# ===========================================
# Final stage - Distroless for security
# ===========================================
FROM gcr.io/distroless/static-debian12:nonroot

# Import from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/bin/lumi-api /usr/local/bin/lumi-api

# Use non-root user (distroless already has nonroot user)
USER nonroot:nonroot

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/lumi-api", "--health-check"]

# Expose port (adjust if your app uses a different port)
EXPOSE 8888

# Set entry point
ENTRYPOINT ["/usr/local/bin/lumi-api"]

# ===========================================
# Labels for metadata
# ===========================================
LABEL \
    org.opencontainers.image.title="Lumi 2025 Backend API" \
    org.opencontainers.image.description="Multi-architecture Go backend for Lumi 2025" \
    org.opencontainers.image.vendor="larza79" \
    org.opencontainers.image.source="https://github.com/larza79/lumi2025" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.created="2025-06-06" \
    org.opencontainers.image.licenses="MIT"