import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useServerSession } from "../useServerSession";

vi.mock("@/lib/session-api", () => ({
  createSession: vi.fn(),
}));

vi.mock("@/lib/session-manager", () => ({
  getServerSessionId: vi.fn(() => null),
  saveServerSessionId: vi.fn(),
  clearServerSessionId: vi.fn(),
}));

import { createSession } from "@/lib/session-api";
import { saveServerSessionId } from "@/lib/session-manager";

const mockedCreateSession = vi.mocked(createSession);
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
    });

    render(<HookProbe {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("session-id").textContent).toBe("s1");
    });
    expect(screen.getByTestId("report-id").textContent).toBe("null");
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
});
