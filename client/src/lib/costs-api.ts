/**
 * Costs API Client
 *
 * Calls the Ingestion Server directly for SDAC cost data.
 * The Ingestion Server proxies to the TherapyLog SDAC API.
 */

import { getIngestionApiUrl } from "./api-config";
import { withWidgetAuthHeaders } from "./widget-auth";

export interface CostRecord {
  [key: string]: unknown;
}

export interface ListCostsResponse {
  costs: CostRecord[];
  total_count: number;
}

/**
 * List costs for a district, optionally filtered by year and quarter.
 */
export async function listCosts(params: {
  districtId: string;
  year?: number;
  quarter?: number;
}): Promise<ListCostsResponse> {
  const url = new URL(`${getIngestionApiUrl()}/sdac/costs`);
  url.searchParams.set("district_id", params.districtId);
  if (params.year) url.searchParams.set("year", String(params.year));
  if (params.quarter) url.searchParams.set("quarter", String(params.quarter));

  const response = await fetch(url.toString(), { headers: withWidgetAuthHeaders() });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch costs: ${response.status}`);
  }
  return response.json();
}

/**
 * Get a single cost record by ID.
 */
export async function getCost(costId: string): Promise<CostRecord> {
  const url = `${getIngestionApiUrl()}/sdac/costs/${costId}`;

  const response = await fetch(url, { headers: withWidgetAuthHeaders() });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch cost: ${response.status}`);
  }
  return response.json();
}
