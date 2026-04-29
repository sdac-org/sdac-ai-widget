import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/api-config", () => ({
  getIngestionApiUrl: vi.fn(() => "https://api.test.com"),
}));

import { createSession, validateSession } from "@/lib/session-api";

const mockFetch = vi.fn();

describe("session-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("createSession", () => {
    it("sends POST with correct body and returns response", async () => {
      const body = {
        session_id: "s1",
        district_id: "d1",
        expires_at: "2026-12-31T00:00:00Z",
        is_new: true,
        report_id: "r1",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      });

      const result = await createSession({
        districtId: "d1",
        userId: "u1",
        userName: "Test",
        userEmail: "test@test.com",
        userRole: "admin",
        quarter: "Q2",
        year: "2025",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/sdac/sessions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_id: "d1",
            user_id: "u1",
            user_email: "test@test.com",
            user_name: "Test",
            user_role: "admin",
            quarter: 2,
            year: 2025,
          }),
        }),
      );
      expect(result).toEqual(body);
    });

    it("includes report_id in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            session_id: "s1",
            district_id: "d1",
            expires_at: "2026-12-31T00:00:00Z",
            is_new: true,
            report_id: "r42",
          }),
      });

      const result = await createSession({ districtId: "d1" });
      expect(result.report_id).toBe("r42");
    });

    it("throws on non-ok response with error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Invalid district" }),
      });

      await expect(createSession({ districtId: "bad" })).rejects.toThrow(
        "Invalid district",
      );
    });

    it("sends null for missing optional params", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            session_id: "s1",
            district_id: "d1",
            expires_at: "2026-12-31T00:00:00Z",
            is_new: true,
          }),
      });

      await createSession({ districtId: "d1" });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.user_id).toBeNull();
      expect(body.user_email).toBeNull();
      expect(body.user_name).toBeNull();
      expect(body.user_role).toBeNull();
      expect(body.quarter).toBeNull();
      expect(body.year).toBeNull();
    });

    it("normalizes quarter and year before sending them", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            session_id: "s1",
            district_id: "d1",
            expires_at: "2026-12-31T00:00:00Z",
            is_new: true,
          }),
      });

      await createSession({ districtId: "d1", quarter: "3", year: "2025" });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.quarter).toBe(3);
      expect(body.year).toBe(2025);
    });
  });

  describe("validateSession", () => {
    it("returns null for 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await validateSession("expired-id");
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/sdac/sessions/expired-id",
        { headers: expect.any(Object) },
      );
    });

    it("throws on non-ok non-404 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(validateSession("s1")).rejects.toThrow(
        "Failed to validate session",
      );
    });
  });
});
