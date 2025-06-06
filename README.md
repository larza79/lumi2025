# Lumi

App to make the best of being at Luminosity beach festival 2025

## Architecture

This application consists of two main components:

- **Backend**: Go API server running on port 8888
- **Frontend**: Static HTML/CSS/JS application served by nginx on port 3000

## Quick Start with Docker Compose

### Production Mode

To run the application in production mode:

```bash
# Build and start all services
make compose-up

# Or manually:
docker-compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8888

### Development Mode

To run the application in development mode:

```bash
# Build and start all services in development mode
make compose-dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d
```

### Useful Commands

```bash
# Build all services
make compose-build

# View logs
make compose-logs

# Stop all services
make compose-down

# Build and run in development mode
make compose-build-dev && make compose-dev
```

## Manual Development

### Backend

```bash
cd backend
go mod download
go run cmd/api/main.go
```

### Frontend

The frontend is a static application that can be served by any web server:

```bash
cd frontend
# Serve with Python (example)
python3 -m http.server 8000 -d src

# Or with any other static file server
```

## Health Checks

The backend includes health check endpoints that are used by Docker Compose to ensure services are ready before starting dependent services.

## Environment Variables

- `DEVELOPMENT`: Set to `true` for development mode, `false` for production
- Backend automatically detects the environment and adjusts logging accordingly

## Port Configuration

- **Backend**: 8888 (internal and external)
- **Frontend**: 8080 (internal nginx), 3000 (external)
- **Frontend Development**: You can access nginx directly on port 8080 if needed
