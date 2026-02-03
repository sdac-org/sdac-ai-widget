
// Client-side implementation of the Ingestion Server Upload API
// Reference: INGESTION_UPLOAD_API_1770118424084.md

const INGESTION_API_BASE = "http://localhost:8000";

export interface IngestionResponse {
  success: boolean;
  message?: string;
  jobId?: string;
  reportId?: string;
  html?: string;
}

export interface SdacUploadParams {
  file: File;
  userEmail: string;
  userName: string;
  district: string;
}

/**
 * Uploads a single file for generic ingestion.
 * Endpoint: POST /ingestion
 */
export async function uploadIngestionFile(file: File): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append("upload", file);

  try {
    const response = await fetch(`${INGESTION_API_BASE}/ingestion`, {
      method: "POST",
      body: formData,
    });

    const htmlText = await response.text();

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}: ${htmlText.substring(0, 100)}...`);
    }

    // Parse HTML to extract job_id if possible
    // The doc says: "The HTML response includes a success message containing the queued job_id (example: Queued ingestion job job-<uuid>.)"
    const jobIdMatch = htmlText.match(/job-([a-f0-9\-]+)/i);
    const jobId = jobIdMatch ? `job-${jobIdMatch[1]}` : undefined;

    return {
      success: true,
      message: "File uploaded successfully.",
      jobId,
      html: htmlText,
    };
  } catch (error) {
    console.error("Ingestion upload error:", error);
    // In mockup mode, if the server is unreachable, we might want to simulate success for demo purposes
    // strict mode: throw error
    throw error;
  }
}

/**
 * Uploads an SDAC cost report (Excel).
 * Endpoint: POST /sdac/upload
 */
export async function uploadSdacReport(params: SdacUploadParams): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append("upload", params.file);
  formData.append("user_email", params.userEmail);
  formData.append("user_name", params.userName);
  formData.append("district", params.district);

  try {
    const response = await fetch(`${INGESTION_API_BASE}/sdac/upload`, {
      method: "POST",
      body: formData,
    });

    const htmlText = await response.text();

    if (!response.ok) {
      throw new Error(`SDAC upload failed with status ${response.status}: ${htmlText.substring(0, 100)}...`);
    }

    // Parse HTML to extract report_id if possible
    // Doc: "The HTML response includes a success message and, when available: report_id"
    // We'll look for a pattern like "Report ID: ..." or similar, but without a specific regex in docs, we might miss it.
    // Let's assume it might be in the text.
    const reportIdMatch = htmlText.match(/report_id[:\s]+([a-z0-9\-]+)/i) || htmlText.match(/report-([a-z0-9\-]+)/i);
    const reportId = reportIdMatch ? reportIdMatch[1] : undefined;

    return {
      success: true,
      message: "SDAC report uploaded successfully.",
      reportId,
      html: htmlText,
    };
  } catch (error) {
    console.error("SDAC upload error:", error);
    throw error;
  }
}

/**
 * Check ingestion job status
 * Endpoint: GET /jobs/{job_id}
 */
export async function checkIngestionJobStatus(jobId: string) {
  const response = await fetch(`${INGESTION_API_BASE}/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to check job status: ${response.status}`);
  }
  return response.json();
}
