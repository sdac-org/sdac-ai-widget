import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AssistantWidget } from "../AssistantWidget";
import * as ingestionApi from "@/lib/ingestion-api";
import { server } from "@/test/msw-server";
import { http, HttpResponse } from "msw";

const REPORT_ID = "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB";

vi.mock("@/lib/ingestion-api", () => ({
  uploadIngestionFile: vi.fn(),
  uploadSdacReport: vi.fn(),
  checkIngestionJobStatus: vi.fn(),
  checkSdacReportAnalysisStatus: vi.fn(),
  checkSdacReportStatus: vi.fn(),
  isExcelFile: vi.fn(),
}));

vi.mock("@/hooks/useHostPageContext", () => ({
  getHostPageContext: vi.fn(() => ({
    districtId: "lzsu",
    districtName: "Plato R-V",
    quarter: "",
    year: "",
    userId: "user-1",
    userName: "Demo User",
    userEmail: "demo@example.com",
    userRole: "District Admin",
  })),
}));

const setReportId = () => {
  sessionStorage.setItem("sdac-uploaded-report-id", REPORT_ID);
};

const mockSession = () => {
  server.use(
    http.post("*/sdac/sessions", () =>
      HttpResponse.json({
        session_id: "test-session-001",
        district_id: "138",
        expires_at: "2026-12-31T00:00:00.000Z",
        is_new: true,
        report_id: REPORT_ID,
        user_id: "demo-user",
        user_email: "demo@example.com",
        user_name: "Demo User",
        user_role: "District Admin",
        district_name: "Demo District",
        quarter: null,
        year: null,
      })
    )
  );
};

const createFile = (name: string, type: string) =>
  new File(["data"], name, { type });

describe("AssistantWidget uploads", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setReportId();
    mockSession();
    vi.clearAllMocks();
    (ingestionApi.checkIngestionJobStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "completed" });
    (ingestionApi.checkSdacReportAnalysisStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "completed", summary: { completed: 9, total: 9 } });
    (ingestionApi.checkSdacReportStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "completed" });
  });

  it("shows re-ingest banner for duplicate SDAC upload", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        reportId: "report-1",
        isDuplicate: true,
        canReingest: true,
        existingReport: {
          district: "North Valley",
          quarter: "Q2",
          year: 2024,
          processed_at: null,
        },
      })
      .mockResolvedValueOnce({ reportId: "report-2" });

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await screen.findByText(/File Already Uploaded/i);
    const reingestButton = await screen.findByRole("button", { name: /re-ingest/i });

    fireEvent.click(reingestButton);

    await screen.findByText(/New Report Created/i);
    expect(ingestionApi.uploadSdacReport).toHaveBeenCalledTimes(2);
    expect(ingestionApi.uploadSdacReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ forceReIngest: true })
    );
  });

  it("uses ingestion upload for non-excel files", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (ingestionApi.uploadIngestionFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("notes.txt", "text/plain");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() =>
      expect(ingestionApi.uploadIngestionFile).toHaveBeenCalledWith(file)
    );
    await screen.findByText(/File Uploaded/i);
  });

  it("shows duplicate report message when re-ingest is unavailable", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-dup",
      isDuplicate: true,
      canReingest: false,
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await screen.findByText(/Report Already Added/i);
    expect(screen.queryByText(/Uploading file:/i)).not.toBeInTheDocument();
  });

  it("shows SDAC report ready status after polling", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-ready",
      isDuplicate: false,
    });
    (ingestionApi.checkSdacReportAnalysisStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "completed",
      summary: { completed: 9, total: 9 },
    });
    (ingestionApi.checkSdacReportStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "processed",
      district: "North Valley",
      quarter: "Q2",
      year: 2024,
      total_personnel_count: 25,
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await screen.findByText(/Report Ready/i);
  }, 10000);

  it("keeps chat input usable while the report is still being prepared", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-pending",
      isDuplicate: false,
    });
    (ingestionApi.checkSdacReportAnalysisStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "running",
      summary: { completed: 3, total: 9 },
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await screen.findByText(/You can keep chatting while this finishes/i);

    const input = screen.getByPlaceholderText(/Ask anything/i);
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: "analyze fringe" } });
    expect(screen.getByDisplayValue("analyze fringe")).toBeInTheDocument();
  }, 10000);

  it("prefers host district name over district id for SDAC uploads", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-ready",
      isDuplicate: false,
    });
    (ingestionApi.checkSdacReportAnalysisStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "completed",
      summary: { completed: 9, total: 9 },
    });
    (ingestionApi.checkSdacReportStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "processed",
      district: "Plato R-V",
      quarter: "Q2",
      year: 2024,
      total_personnel_count: 12,
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xls", "application/vnd.ms-excel");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() =>
      expect(ingestionApi.uploadSdacReport).toHaveBeenCalledWith(
        expect.objectContaining({ district: "Plato R-V" })
      )
    );
  });

  it("shows ingestion failed status when job fails", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (ingestionApi.uploadIngestionFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      jobId: "job-1",
    });
    (ingestionApi.checkIngestionJobStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "failed",
      error: "Bad file",
    });

    const { container } = render(<AssistantWidget />);
    const file = createFile("notes.txt", "text/plain");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await screen.findByText(/File Uploaded/i);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await screen.findByText(/Ingestion Failed/i);
  }, 10000);

  it("shows a fallback success message when SDAC polling fails", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-error",
      isDuplicate: false,
    });
    (ingestionApi.checkSdacReportAnalysisStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await screen.findByText(/SDAC Report Uploaded/i);
  }, 10000);
});
