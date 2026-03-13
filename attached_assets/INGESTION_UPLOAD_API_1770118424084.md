# Ingestion Server Upload API

This document describes the current HTTP endpoints and request contracts for uploading files to the Ingestion Server and checking status.

## Base URL

The server is hosted by the FastAPI app in `ingestion_server.web.app`. In local development it is commonly served at:

- `http://localhost:8000`

## Authentication

No authentication is enforced by the server code shown here. If your deployment places the app behind an auth proxy or gateway, use that layer’s requirements.

## Endpoints

### Upload a file for ingestion (generic)

**POST /ingestion**

Uploads a single file for ingestion. The request must be `multipart/form-data`.

**Form fields**

- `upload` (file, required): The file to ingest.
- `content_type` (string, optional): Overrides the detected content type. If omitted, the server uses the uploaded file’s content type.

**Successful response**

- HTTP 200
- Content-Type: `text/html`
- The HTML response includes a success message containing the queued `job_id` (example: `Queued ingestion job job-<uuid>.`).

**Error responses**

- HTTP 400 with HTML response if no file is provided.
- HTTP 500 with HTML response if ingestion submission fails.

**Notes**

- This endpoint renders an HTML template, not JSON. If your client is a service, you will need to parse the HTML to extract the `job_id` or add a dedicated JSON endpoint.
- Large files may be routed to Azure Functions automatically by the server’s processing rules.

---

### Check ingestion job status

**GET /jobs/{job_id}**

Returns JSON status for an async ingestion job created by `POST /ingestion`.

**Successful response** (JSON)

- When a job is known:
  - `status`: `queued` | `completed` | `failed`
  - `tracking_id` (string, only when `completed`): The processor tracking identifier.
  - `error` (string, only when `failed`): Error text if the async job failed.

- When a job is unknown:
  - `status`: `unknown`

---

### Upload an SDAC cost report (Excel)

**POST /sdac/upload**

Uploads an SDAC cost report (Excel) for processing and archiving. The request must be `multipart/form-data`.

**Form fields**

- `upload` (file, required): Excel file (`.xlsx` or `.xls`).
- `user_email` (string, required): User email address.
- `user_name` (string, required): User full name.
- `district` (string, required): District or organization.

**Successful response**

- HTTP 200
- Content-Type: `text/html`
- The HTML response includes a success message and, when available:
  - `report_id`
  - `record_count`

**Error responses**

- HTTP 400 with HTML response for missing file or invalid file extension.
- HTTP 500 with HTML response if processing fails.

**Notes**

- This endpoint returns HTML, not JSON.
- File validation is enforced on extension (`.xlsx` / `.xls`).

---

### Check SDAC report status

**GET /sdac/reports/{report_id}**

Returns JSON status information for a processed SDAC report.

**Successful response** (JSON)

When a report is found, the payload contains:

- `report_id` (string)
- `district` (string)
- `quarter` (string or number)
- `year` (string or number)
- `status` (string)
- `processed_at` (ISO 8601 timestamp or null)
- `main_roster_count` (number)
- `replacement_count` (number)
- `total_personnel_count` (number)

When a report is not found:

- `report_id` (string)
- `status`: `not_found`
- `message`: `No records found for this report ID`

On server errors:

- `report_id` (string)
- `status`: `error`
- `message`: `Unable to fetch report status right now.`

## Implementation references

- Upload endpoints and status routes are defined in [src/ingestion_server/web/app.py](src/ingestion_server/web/app.py).
- SDAC upload details and field requirements are also described in [SDAC_README.md](SDAC_README.md).
