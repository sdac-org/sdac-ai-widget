# SDAC AI Widget Deployment Guide

This guide covers deploying the SDAC AI Widget container and wiring it to the ingestion service it depends on.

## Architecture

The deployed widget has two layers:

1. The browser loads the widget UI from the widget container.
2. The widget server proxies all SDAC API traffic to the ingestion service through `/api/ingestion/*`.

The browser does not call upstream SDAC services directly.

## Required Runtime Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `INGESTION_API_URL` | Base URL of the ingestion service the widget server should proxy to | `http://host.docker.internal:8000` |
| `SDAC_AGENT_ID` | Optional default agent ID exposed through `GET /api/config` | `sdac-coordinator-release` |
| `HOST_PORT` | Host port for the widget container | `5000` |

## Quick Start

### 1. Configure Environment

```bash
cp .env.docker .env
```

Set at least:

```bash
INGESTION_API_URL=http://host.docker.internal:8000
SDAC_AGENT_ID=sdac-coordinator-release
HOST_PORT=5000
```

### 2. Build and Run

```bash
docker compose build
docker compose up -d
docker compose logs -f
```

### 3. Open the Widget

```bash
open http://localhost:5000
```

## Deployment Scenarios

### Scenario 1: Local Ingestion Service

Use this for local development.

```bash
INGESTION_API_URL=http://host.docker.internal:8000
SDAC_AGENT_ID=sdac-coordinator-release
HOST_PORT=5000
```

Start the ingestion service first:

```bash
cd /path/to/ingestion-server
uvicorn ingestion_server.web.app:app --reload --port 8000
```

Then start the widget:

```bash
cd /path/to/sdac-ai-widget
docker compose up -d
```

### Scenario 2: Remote Ingestion Service

Use this when the ingestion service is already deployed elsewhere.

```bash
INGESTION_API_URL=https://your-ingestion-service.example.com
SDAC_AGENT_ID=sdac-coordinator-release
HOST_PORT=80
```

The widget container needs network access only to the ingestion service.

## Azure Deployment

### Azure Container Instance

```bash
docker compose build
docker tag sdac-ai-widget:latest yourregistry.azurecr.io/sdac-ai-widget:latest

az acr login --name yourregistry
docker push yourregistry.azurecr.io/sdac-ai-widget:latest

az container create \
  --resource-group your-rg \
  --name sdac-widget \
  --image yourregistry.azurecr.io/sdac-ai-widget:latest \
  --dns-name-label sdac-widget \
  --ports 5000 \
  --environment-variables \
    INGESTION_API_URL=https://your-ingestion-service.example.com \
    SDAC_AGENT_ID=sdac-coordinator-release
```

### Azure App Service

```bash
az appservice plan create \
  --name sdac-widget-plan \
  --resource-group your-rg \
  --is-linux \
  --sku B1

az webapp create \
  --resource-group your-rg \
  --plan sdac-widget-plan \
  --name sdac-widget-app \
  --deployment-container-image-name yourregistry.azurecr.io/sdac-ai-widget:latest

az webapp config appsettings set \
  --resource-group your-rg \
  --name sdac-widget-app \
  --settings \
    INGESTION_API_URL=https://your-ingestion-service.example.com \
    SDAC_AGENT_ID=sdac-coordinator-release
```

## Build-Time Settings

These values are baked into the client bundle and require a rebuild when changed.

| Variable | Description |
|----------|-------------|
| `VITE_REPORT_ID` | Optional default report ID |
| `VITE_DEMO_USER_ID` | Demo user ID for local testing |
| `VITE_DEMO_USER_NAME` | Demo user name |
| `VITE_DEMO_USER_EMAIL` | Demo user email |
| `VITE_DEMO_USER_ROLE` | Demo user role |
| `VITE_DEMO_DISTRICT` | Demo district label |
| `VITE_DEMO_DISTRICT_ID` | Demo district ID |

Rebuild after changing build-time settings:

```bash
docker compose build --no-cache
docker compose up -d
```

## Connectivity Model

- Browser to widget server: same origin, `/api/config` and `/api/ingestion/*`
- Widget server to ingestion service: server-to-server via `INGESTION_API_URL`
- The widget server does not require a separate base URL for the review service

## Common Proxied Paths

The browser-facing widget backend commonly proxies these same-origin routes:

| Widget Path | Upstream Path | Purpose |
|-------------|---------------|---------|
| `/api/config` | n/a | Returns runtime widget config such as `agentId` |
| `/api/ingestion/sdac/upload` | `/sdac/upload` | Workbook upload |
| `/api/ingestion/sdac/ingest` | `/sdac/ingest` | Structured payload ingest |
| `/api/ingestion/sdac/sessions` | `/sdac/sessions` | Create or resume a district session |
| `/api/ingestion/sdac/sessions/{session_id}` | `/sdac/sessions/{session_id}` | Validate an existing session |
| `/api/ingestion/sdac/sync` | `/sdac/sync` | Resolve or refresh the latest district report |
| `/api/ingestion/sdac/costs` | `/sdac/costs` | List district cost records |
| `/api/ingestion/sdac/costs/{cost_id}` | `/sdac/costs/{cost_id}` | Get cost record detail |
| `/api/ingestion/sdac/chat` | `/sdac/chat` | Streaming chat |
| `/api/ingestion/sdac/validate` | `/sdac/validate` | Report validation |
| `/api/ingestion/sdac/feedback` | `/sdac/feedback` | Feedback submission |
| `/api/ingestion/sdac/report/{report_id}` | `/sdac/report/{report_id}` | Report header metadata |
| `/api/ingestion/sdac/reports/{report_id}` | `/sdac/reports/{report_id}` | Ingestion-side report status |

## Verification

### Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-30T15:00:00.000Z"
}
```

### Config Check

```bash
curl http://localhost:5000/api/config
```

Expected response:

```json
{
  "agentId": "sdac-coordinator-release"
}
```

### Proxy Check

```bash
curl http://localhost:5000/api/ingestion/health
```

## Troubleshooting

### The widget loads but API requests fail

Check widget logs:

```bash
docker compose logs -f
```

Confirm the ingestion service is reachable from the container:

```bash
docker exec sdac-widget wget -O- $INGESTION_API_URL/health
```

### Upload or chat requests fail

Check:

- `INGESTION_API_URL` points to the correct ingestion service
- The ingestion service itself is healthy
- The widget server can reach that host from inside the container

### Agent ID is missing in the client

Set `SDAC_AGENT_ID` and restart the widget container.
