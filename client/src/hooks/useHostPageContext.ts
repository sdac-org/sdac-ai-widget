/**
 * Host Page Context Hook
 *
 * Reads context passed from the host page (TherapyLog) via embed.js.
 * embed.js reads data attributes from the host page DOM and passes
 * them to the iframe as URL query parameters.
 *
 * User identity may fall back to VITE_DEMO_* env vars for local development,
 * but district/report context must come from the host page.
 */

export interface HostPageContext {
  /** District ID from TherapyLog page (data-sdac-district-id) */
  districtId: string;
  /** District name from host page metadata */
  districtName: string;
  /** Quarter from host page metadata */
  quarter: string;
  /** Year from host page metadata */
  year: string;
  /** User ID -- from host page attrs or env var fallback */
  userId: string;
  /** User display name */
  userName: string;
  /** User email */
  userEmail: string;
  /** User role */
  userRole: string;
}

/**
 * Reads host page context from URL search params (set by embed.js).
 * Returns stable values -- safe to call on every render.
 */
export function getHostPageContext(): HostPageContext {
  const params = new URLSearchParams(window.location.search);

  return {
    districtId: params.get("districtId") || "",
    districtName: params.get("districtName") || "",
    quarter: params.get("quarter") || "",
    year: params.get("year") || "",
    userId: params.get("userId") || import.meta.env.VITE_DEMO_USER_ID || "demo-user",
    userName: params.get("userName") || import.meta.env.VITE_DEMO_USER_NAME || "Demo User",
    userEmail: params.get("userEmail") || import.meta.env.VITE_DEMO_USER_EMAIL || "",
    userRole: params.get("userRole") || import.meta.env.VITE_DEMO_USER_ROLE || "District Admin",
  };
}
