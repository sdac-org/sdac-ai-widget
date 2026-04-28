import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useServerSession } from "../useServerSession";

vi.mock("@/lib/session-api", () => ({
  createSession: vi.fn(),
}));

vi.mock("@/hooks/useHostPageContext", () => ({
  getHostPageContext: vi.fn(() => ({
    districtId: "district-1",
    districtName: "District One",
    quarter: "Q2",
    year: "2025",
    userId: "user-1",
    userName: "Test User",
    userEmail: "test@example.com",
    userRole: "admin",
  })),
}));

vi.mock("@/lib/session-manager", () => ({
  getServerSessionId: vi.fn(() => null),
  saveServerSessionId: vi.fn(),
  clearServerSessionId: vi.fn(),
}));

import { createSession } from "@/lib/session-api";
import { getHostPageContext } from "@/hooks/useHostPageContext";
import { clearServerSessionId, saveServerSessionId } from "@/lib/session-manager";

const mockedCreateSession = vi.mocked(createSession);
const mockedGetHostPageContext = vi.mocked(getHostPageContext);
const mockedClearServerSessionId = vi.mocked(clearServerSessionId);
const mockedSaveServerSessionId = vi.mocked(saveServerSessionId);

interface HookProbeProps {
  districtId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

function HookProbe(props: HookProbeProps) {
  const result = useServerSession(props);
  return (
    <div>
      <div data-testid="session-id">{result.serverSessionId ?? "null"}</div>
      <div data-testid="report-id">{result.reportId ?? "null"}</div>
      <div data-testid="resolution-status">{result.resolutionStatus ?? "null"}</div>
      <div data-testid="fallback-quarter">{result.fallbackCandidate?.quarter ?? "null"}</div>
      <div data-testid="is-initializing">{String(result.isInitializing)}</div>
      <div data-testid="error">{result.error ?? "null"}</div>
    </div>
  );
}

const BASE_PROPS: HookProbeProps = {
  districtId: "district-1",
  userId: "user-1",
  userName: "Test User",
  userEmail: "test@example.com",
  userRole: "admin",
};

const SESSION_RESPONSE = {
  session_id: "s1",
  district_id: "district-1",
  expires_at: "2026-12-31T00:00:00Z",
  is_new: true,
  report_id: null as string | null,
  user_id: "user-1",
  user_email: "test@example.com",
  user_name: "Test User",
  user_role: "admin",
};

describe("useServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedGetHostPageContext.mockReturnValue({
      districtId: "district-1",
      districtName: "District One",
      quarter: "Q2",
      year: "2025",
      userId: "user-1",
      userName: "Test User",
      userEmail: "test@example.com",
      userRole: "admin",
    });
  });

  it("returns reportId when session response includes report_id", async () => {
    mockedCreateSession.mockResolvedValue({
      ...SESSION_RESPONSE,
      report_id: "r1",
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("report-id").textContent).toBe("r1");
    });
    expect(screen.getByTestId("session-id").textContent).toBe("s1");
  });

  it("returns null reportId when session response has no report_id", async () => {
    mockedCreateSession.mockResolvedValue({
      ...SESSION_RESPONSE,
      report_id: null,
      resolution_status: "no_data",
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("session-id").textContent).toBe("s1");
    });
    expect(screen.getByTestId("report-id").textContent).toBe("null");
    expect(screen.getByTestId("resolution-status").textContent).toBe("no_data");
  });

  it("surfaces fallback metadata when exact quarter is unavailable", async () => {
    mockedCreateSession.mockResolvedValue({
      ...SESSION_RESPONSE,
      report_id: null,
      resolution_status: "fallback_available",
      requested_quarter: "Q2",
      requested_year: 2025,
      fallback_candidate: {
        quarter: "Q2",
        year: 2024,
        record_count: 14,
      },
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("resolution-status").textContent).toBe("fallback_available");
    });
    expect(screen.getByTestId("fallback-quarter").textContent).toBe("Q2");
  });

  it("sets error on createSession failure", async () => {
    mockedCreateSession.mockRejectedValue(new Error("Network error"));

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe("Network error");
    });
    expect(screen.getByTestId("session-id").textContent).toBe("null");
  });

  it("does not initialize when districtId is empty", async () => {
    render(<HookProbe {...BASE_PROPS} districtId="" />);

    // Give it a tick to ensure no async work fires
    await waitFor(() => {
      expect(screen.getByTestId("is-initializing").textContent).toBe("false");
    });
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it("saves session id to session storage", async () => {
    mockedCreateSession.mockResolvedValue({
      ...SESSION_RESPONSE,
      session_id: "s1",
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(mockedSaveServerSessionId).toHaveBeenCalledWith("s1");
    });
  });

  it("passes host quarter and year when creating the server session", async () => {
    mockedCreateSession.mockResolvedValue({
      ...SESSION_RESPONSE,
      session_id: "s1",
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(mockedCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          districtId: "district-1",
          quarter: "Q2",
          year: "2025",
        }),
      );
    });
  });

  it("reinitializes when the page context changes", async () => {
    mockedCreateSession
      .mockResolvedValueOnce({
        ...SESSION_RESPONSE,
        session_id: "s1",
        report_id: "r1",
      })
      .mockResolvedValueOnce({
        ...SESSION_RESPONSE,
        session_id: "s2",
        report_id: "r2",
        district_id: "district-2",
      });

    const { rerender } = render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("report-id").textContent).toBe("r1");
    });

    mockedGetHostPageContext.mockReturnValue({
      districtId: "district-2",
      districtName: "District Two",
      quarter: "Q3",
      year: "2025",
      userId: "user-1",
      userName: "Test User",
      userEmail: "test@example.com",
      userRole: "admin",
    });

    rerender(<HookProbe {...BASE_PROPS} districtId="district-2" />);

    await waitFor(() => {
      expect(screen.getByTestId("report-id").textContent).toBe("r2");
    });
    expect(mockedClearServerSessionId).toHaveBeenCalledTimes(2);
    expect(mockedCreateSession).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        districtId: "district-2",
        quarter: "Q3",
        year: "2025",
      }),
    );
  });
});
