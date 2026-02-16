import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConversationId,
  clearUploadedReportId,
  getConversationId,
  getOrCreateSessionId,
  getUploadedReportId,
  saveConversationId,
  saveUploadedReportId,
} from "@/lib/session-manager";

describe("session-manager", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates one tab session id and reuses it", () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("stores and clears conversation ids per report", () => {
    saveConversationId("report-a", "conv-a");
    saveConversationId("report-b", "conv-b");

    expect(getConversationId("report-a")).toBe("conv-a");
    expect(getConversationId("report-b")).toBe("conv-b");

    clearConversationId("report-a");
    expect(getConversationId("report-a")).toBeNull();
    expect(getConversationId("report-b")).toBe("conv-b");
  });

  it("stores and clears uploaded report id", () => {
    expect(getUploadedReportId()).toBeNull();

    saveUploadedReportId("report-123");
    expect(getUploadedReportId()).toBe("report-123");

    clearUploadedReportId();
    expect(getUploadedReportId()).toBeNull();
  });
});
