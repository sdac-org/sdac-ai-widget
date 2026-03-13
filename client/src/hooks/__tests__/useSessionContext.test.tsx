import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSessionContext } from "../useSessionContext";

const USER = { id: "demo-user", name: "Demo", role: "District Admin" } as const;

function HookProbe({ reportId }: { reportId: string }) {
  const { conversationId, setConversationId } = useSessionContext({
    reportId,
    user: USER,
  });

  return (
    <div>
      <div data-testid="conversation-id">{conversationId ?? "null"}</div>
      <button onClick={() => setConversationId("new-conv")}>set-conv</button>
    </div>
  );
}

describe("useSessionContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("loads conversation id for each report and resets when report changes", () => {
    sessionStorage.setItem("sdac-conversation-report-a", "conv-a");
    sessionStorage.setItem("sdac-conversation-report-b", "conv-b");

    const { rerender } = render(<HookProbe reportId="report-a" />);
    expect(screen.getByTestId("conversation-id").textContent).toBe("conv-a");

    rerender(<HookProbe reportId="report-b" />);
    expect(screen.getByTestId("conversation-id").textContent).toBe("conv-b");

    rerender(<HookProbe reportId="report-c" />);
    expect(screen.getByTestId("conversation-id").textContent).toBe("null");
  });

  it("persists conversation id under the active report key", () => {
    const { rerender } = render(<HookProbe reportId="report-a" />);
    fireEvent.click(screen.getByRole("button", { name: "set-conv" }));

    expect(sessionStorage.getItem("sdac-conversation-report-a")).toBe("new-conv");

    rerender(<HookProbe reportId="report-b" />);
    expect(screen.getByTestId("conversation-id").textContent).toBe("null");
  });
});
