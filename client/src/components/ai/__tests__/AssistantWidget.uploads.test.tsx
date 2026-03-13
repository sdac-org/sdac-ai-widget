import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AssistantWidget } from "../AssistantWidget";

const REPORT_ID = "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB";

vi.mock("@/lib/ingestion-api", () => ({
  uploadIngestionFile: vi.fn(),
  uploadSdacReport: vi.fn(),
  checkIngestionJobStatus: vi.fn(),
  checkSdacReportStatus: vi.fn(),
  isExcelFile: vi.fn(),
}));

const ingestionApi = await import("@/lib/ingestion-api");

const setReportId = () => {
  sessionStorage.setItem("sdac-uploaded-report-id", REPORT_ID);
};

const createFile = (name: string, type: string) =>
  new File(["data"], name, { type });

describe("AssistantWidget uploads", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setReportId();
    vi.clearAllMocks();
    (ingestionApi.checkIngestionJobStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "completed" });
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

    await screen.findByText(/Report Already Exists/i);
  });

  it("shows SDAC report ready status after polling", async () => {
    (ingestionApi.isExcelFile as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (ingestionApi.uploadSdacReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      reportId: "report-ready",
      isDuplicate: false,
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
    await screen.findByText(/SDAC Report Ready/i);
  }, 10000);

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
    (ingestionApi.checkSdacReportStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const { container } = render(<AssistantWidget />);
    const file = createFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    fireEvent.drop(container.firstElementChild as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await screen.findByText(/SDAC Report Uploaded Successfully/i);
  }, 10000);
});
