# SDAC AI Widget - Deployment Guide

This guide covers deploying the SDAC AI Widget using Docker in various scenarios.

## Prerequisites

- Docker and Docker Compose installed
- Access to Mastra and Ingestion Server URLs

## Quick Start

### 1. Configure Environment

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and set your service URLs:

```bash
# For local services
MASTRA_BASE_URL=http://host.docker.internal:4111
INGESTION_API_URL=http://host.docker.internal:8000

# For Azure services
# MASTRA_BASE_URL=https://your-mastra.azurewebsites.net
# INGESTION_API_URL=https://your-ingestion.azurewebsites.net
```

### 2. Build and Run

```bash
# Build the image
docker compose build

# Start the container
docker compose up -d

# Check logs
docker compose logs -f

# Access the widget
open http://localhost:5000
```

### 3. Stop

```bash
docker compose down
```

## Deployment Scenarios

### Scenario 1: All Services Local (Development)

**Use Case:** Testing locally with all services on your machine.

**Configuration** (`.env`):
```bash
MASTRA_BASE_URL=http://host.docker.internal:4111
INGESTION_API_URL=http://host.docker.internal:8000
HOST_PORT=5000
```

**Start Services:**
```bash
# Terminal 1: Start Mastra
cd /path/to/mastra
npm run dev  # or your Mastra start command

# Terminal 2: Start Ingestion Server
cd /path/to/ingestion-server
uvicorn ingestion_server.web.app:app --reload --port 8000

# Terminal 3: Start Widget
cd /path/to/sdac-ai-widget
docker compose up -d
```

**Notes:**
- `host.docker.internal` allows Docker to reach services on your host machine
- Ensure Mastra runs on port 4111 and Ingestion Server on port 8000

---

### Scenario 2: All Services on Azure (Production)

**Use Case:** Full production deployment with all services on Azure.

**Configuration** (`.env`):
```bash
MASTRA_BASE_URL=https://your-mastra.azurewebsites.net
INGESTION_API_URL=https://your-ingestion.azurewebsites.net
HOST_PORT=80
MASTRA_AGENT_ID=sdac-coordinator-release
```

**Deploy Widget to Azure:**

Option A: **Azure Container Instances**
```bash
# Build and tag image
docker compose build
docker tag sdac-ai-widget:latest yourregistry.azurecr.io/sdac-ai-widget:latest

# Push to Azure Container Registry
az acr login --name yourregistry
docker push yourregistry.azurecr.io/sdac-ai-widget:latest

# Create container instance
az container create \
  --resource-group your-rg \
  --name sdac-widget \
  --image yourregistry.azurecr.io/sdac-ai-widget:latest \
  --dns-name-label sdac-widget \
  --ports 5000 \
  --environment-variables \
    MASTRA_BASE_URL=https://your-mastra.azurewebsites.net \
    INGESTION_API_URL=https://your-ingestion.azurewebsites.net \
    MASTRA_AGENT_ID=sdac-coordinator-release
```

Option B: **Azure App Service (Container)**
```bash
# Create App Service Plan
az appservice plan create \
  --name sdac-widget-plan \
  --resource-group your-rg \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --resource-group your-rg \
  --plan sdac-widget-plan \
  --name sdac-widget-app \
  --deployment-container-image-name yourregistry.azurecr.io/sdac-ai-widget:latest

# Configure environment variables
az webapp config appsettings set \
  --resource-group your-rg \
  --name sdac-widget-app \
  --settings \
    MASTRA_BASE_URL=https://your-mastra.azurewebsites.net \
    INGESTION_API_URL=https://your-ingestion.azurewebsites.net \
    MASTRA_AGENT_ID=sdac-coordinator-release
```

---

### Scenario 3: Local Ingestion, Remote Mastra (Hybrid)

**Use Case:** Testing with production Mastra but local ingestion server.

**Configuration** (`.env`):
```bash
MASTRA_BASE_URL=https://your-mastra.azurewebsites.net
INGESTION_API_URL=http://host.docker.internal:8000
HOST_PORT=5000
```

**Start:**
```bash
# Terminal 1: Start local Ingestion Server
cd /path/to/ingestion-server
uvicorn ingestion_server.web.app:app --reload --port 8000

# Terminal 2: Start Widget (using remote Mastra)
cd /path/to/sdac-ai-widget
docker compose up -d
```

---

### Scenario 4: Widget on Azure, Services Elsewhere

**Use Case:** Widget deployed to Azure, connecting to services on different infrastructure.

**Configuration:**

Set environment variables in Azure portal or CLI:
```bash
az webapp config appsettings set \
  --resource-group your-rg \
  --name sdac-widget-app \
  --settings \
    MASTRA_BASE_URL=https://your-mastra-service.com \
    INGESTION_API_URL=https://your-ingestion-service.com \
    MASTRA_AGENT_ID=sdac-coordinator-release
```

---

## Environment Variables Reference

### Runtime Variables (Server-side)
These can be changed without rebuilding:

| Variable | Description | Example |
|----------|-------------|---------|
| `MASTRA_BASE_URL` | Mastra server URL | `http://host.docker.internal:4111` |
| `INGESTION_API_URL` | Ingestion server URL | `http://host.docker.internal:8000` |
| `MASTRA_AGENT_ID` | Agent identifier | `sdac-coordinator-release` |
| `HOST_PORT` | Port to expose | `5000` |

### Build-time Variables (Client-side)
These require rebuilding the image:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_REPORT_ID` | Default report ID | `8201EDC2-...` |
| `VITE_DEMO_USER_NAME` | Demo user name | `Demo User` |
| `VITE_DEMO_USER_EMAIL` | Demo user email | `demo@example.com` |
| `VITE_DEMO_DISTRICT` | Demo district | `Demo District` |

**To change build-time variables:**
```bash
# Edit .env
nano .env

# Rebuild
docker compose build --no-cache
docker compose up -d
```

---

## Networking

### Docker → Host Services
Use `host.docker.internal` to reach services on your host machine:
```bash
INGESTION_API_URL=http://host.docker.internal:8000
```

### Docker → Docker Services
If services are in the same Docker network, use container names:
```bash
INGESTION_API_URL=http://ingestion-server:8000
```

### Azure → Azure Services
Use internal service URLs when possible for better performance:
```bash
MASTRA_BASE_URL=https://your-mastra.azurewebsites.net
```

---

## Troubleshooting

### Check Container Status
```bash
docker compose ps
docker compose logs -f
```

### Test Connectivity
```bash
# From host
curl http://localhost:5000/api/health

# From inside container
docker exec sdac-widget wget -O- http://localhost:5000/api/health
```

### Connection Issues
If ingestion/Mastra calls fail:

1. **Check URLs in logs:**
   ```bash
   docker compose logs | grep "Ingestion server URL"
   docker compose logs | grep "Mastra"
   ```

2. **Test from container:**
   ```bash
   docker exec sdac-widget wget -O- $MASTRA_BASE_URL/health
   docker exec sdac-widget wget -O- $INGESTION_API_URL/
   ```

3. **Verify environment:**
   ```bash
   docker exec sdac-widget env | grep -E "MASTRA|INGESTION"
   ```

### Rebuild from Scratch
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Production Checklist

- [ ] Set actual service URLs (not `host.docker.internal`)
- [ ] Use HTTPS URLs for production services
- [ ] Remove demo/test credentials from build args
- [ ] Enable Azure Application Insights (if using Azure)
- [ ] Set up proper logging and monitoring
- [ ] Configure health checks in Azure
- [ ] Use Azure Key Vault for secrets
- [ ] Set up CI/CD pipeline for automated builds
- [ ] Configure auto-scaling rules
- [ ] Enable Azure Container Registry scanning

---

## CI/CD Example (GitHub Actions)

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Azure Container Registry
        uses: docker/login-action@v2
        with:
          registry: yourregistry.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push
        run: |
          docker compose build
          docker tag sdac-ai-widget:latest yourregistry.azurecr.io/sdac-ai-widget:latest
          docker push yourregistry.azurecr.io/sdac-ai-widget:latest

      - name: Deploy to Azure
        run: |
          az webapp config container set \
            --name sdac-widget-app \
            --resource-group your-rg \
            --docker-custom-image-name yourregistry.azurecr.io/sdac-ai-widget:latest
```

---

## Support

For issues or questions:
- Check logs: `docker compose logs -f`
- Review environment: `docker exec sdac-widget env`
- Test health: `curl http://localhost:5000/api/health`
