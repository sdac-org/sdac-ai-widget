
// Client-side implementation of the Ingestion Server Upload API
// Reference: INGESTION_UPLOAD_API_1770118424084.md
// NOTE: Requests now go directly to the Ingestion Server (no Express proxy)

import { getIngestionApiUrl } from "./api-config";

export interface IngestionResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  errorCategory?: "wrong_file_format" | "missing_data" | "processing_error" | string;
  details?: string[];
  message?: string;
  jobId?: string;
  reportId?: string;
  isDuplicate?: boolean;
  canReingest?: boolean;
  existingReport?: {
    district: string;
    quarter: string;
    year: number;
    processed_at: string | null;
  };
  analysisStatus?: {
    status: string;
    reportId: string;
    pollUrl?: string;
  };
  html?: string;
}

export interface SdacUploadParams {
  file: File;
  userEmail: string;
  userName: string;
  district: string;
  forceReIngest?: boolean;
}

/**
 * Uploads a single file for generic ingestion.
 * Direct to Ingestion Server: POST /ingestion
 */
export async function uploadIngestionFile(file: File): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append("upload", file);

  try {
    console.log("[ingestion-api] Uploading file:", file.name, "Size:", file.size, "bytes");
    const response = await fetch(`${getIngestionApiUrl()}/ingestion`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[ingestion-api] Upload failed:", data.error);
      throw new Error(data.error || `Upload failed with status ${response.status}`);
    }

    console.log("[ingestion-api] Upload successful, jobId:", data.jobId);
    return data as IngestionResponse;
  } catch (error) {
    console.error("[ingestion-api] Ingestion upload error:", error);
    throw error;
  }
}

/**
 * Uploads an SDAC cost report (Excel).
 * Direct to Ingestion Server: POST /sdac/upload
 */
export async function uploadSdacReport(params: SdacUploadParams): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append("upload", params.file);
  formData.append("user_email", params.userEmail);
  formData.append("user_name", params.userName);
  formData.append("district", params.district);
  if (params.forceReIngest) {
    formData.append("force_reingest", "true");
  }

  try {
    console.log("[ingestion-api] Uploading SDAC report:", params.file.name, params.forceReIngest ? "(force re-ingest)" : "");
    console.log("[ingestion-api] User:", params.userName, "District:", params.district);

    const response = await fetch(`${getIngestionApiUrl()}/sdac/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[ingestion-api] SDAC upload failed:", data.error);
      const details = Array.isArray(data.details)
        ? data.details.filter((item: unknown) => typeof item === "string")
        : [];
      const categoryLabelMap: Record<string, string> = {
        wrong_file_format: "Wrong file format",
        missing_data: "Missing required data",
        processing_error: "Processing error",
      };
      const categoryLabel = typeof data.errorCategory === "string"
        ? categoryLabelMap[data.errorCategory] || data.errorCategory
        : "";
      const issueSummary = data.error || "SDAC upload failed. Please verify the file format and try again.";
      const issueHeading = categoryLabel ? `**Issue:** ${categoryLabel}` : "**Issue:** Upload problem";
      const fixSection = details.length > 0
        ? `\n\n**How to fix**\n${details.map((item: string) => `- ${item}`).join("\n")}`
        : "";
      throw new Error(`${issueHeading}\n\n${issueSummary}${fixSection}`);
    }

    console.log("[ingestion-api] SDAC upload successful, reportId:", data.reportId);
    return data as IngestionResponse;
  } catch (error) {
    console.error("[ingestion-api] SDAC upload error:", error);
    throw error;
  }
}

/**
 * Check ingestion job status
 * Direct to Ingestion Server: GET /jobs/{job_id}
 */
export async function checkIngestionJobStatus(jobId: string) {
  console.log("[ingestion-api] Checking job status:", jobId);
  const response = await fetch(`${getIngestionApiUrl()}/jobs/${jobId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to check job status: ${response.status}`);
  }
  const data = await response.json();
  console.log("[ingestion-api] Job status:", data.status);
  return data;
}

/**
 * Check SDAC report status
 * Direct to Ingestion Server: GET /sdac/reports/{report_id}
 */
export async function checkSdacReportStatus(reportId: string) {
  console.log("[ingestion-api] Checking SDAC report status:", reportId);
  const response = await fetch(`${getIngestionApiUrl()}/sdac/reports/${reportId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to check report status: ${response.status}`);
  }
  const data = await response.json();
  console.log("[ingestion-api] SDAC report status:", data.status);
  return data;
}

/**
 * Check SDAC analysis status
 * Direct to Ingestion Server: GET /sdac/reports/{report_id}/analysis-status
 */
export async function checkSdacReportAnalysisStatus(reportId: string) {
  console.log("[ingestion-api] Checking SDAC analysis status:", reportId);
  const response = await fetch(`${getIngestionApiUrl()}/sdac/reports/${reportId}/analysis-status`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to check analysis status: ${response.status}`);
  }
  const data = await response.json();
  console.log("[ingestion-api] SDAC analysis status:", data.status);
  return data;
}

/**
 * Helper to determine if a file is an Excel file (for SDAC upload)
 */
export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}
