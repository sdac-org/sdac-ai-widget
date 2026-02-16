import { test, expect } from "@playwright/test";

const sseResponse = (content: string, metadata: Record<string, unknown>) =>
  [
    `event: metadata\n`,
    `data: ${JSON.stringify(metadata)}\n\n`,
    `event: delta\n`,
    `data: ${JSON.stringify({ content })}\n\n`,
    `event: done\n`,
    `data: ${JSON.stringify({ success: true })}\n\n`,
  ].join("");

test("chat and feedback flow", async ({ page }) => {
  await page.route("**/api/agent-chat", async (route) => {
    const responseBody = sseResponse("Playwright response", {
      conversationId: "session-1",
      conversationSk: 101,
      turnNumber: 3,
    });
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: responseBody,
    });
  });

  await page.route("**/api/sdac/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, feedbackSk: 555 }),
    });
  });

  await page.goto("/#/widget");

  await page.getByPlaceholder("Ask anything...").fill("Check variance");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Playwright response")).toBeVisible();

  await page.getByRole("button", { name: "Thumbs up" }).click();
  await page.getByRole("button", { name: "Submit feedback" }).click();

  await expect(page.getByText("Submitted")).toBeVisible();
});

test("evaluate issues flow", async ({ page }) => {
  await page.route("**/api/validate-report", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reportId: "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB",
        districtName: "North Valley",
        quarter: "Q2",
        totalRecords: 3,
        issues: [
          {
            id: 1,
            priority: "high",
            title: "Missing fringe",
            description: "Fringe variance is missing",
            amount: 1200,
            category: "Fringe",
          },
        ],
        summary: {
          errorCount: 1,
          warningCount: 0,
          passedCount: 2,
          analysisTime: 12,
        },
      }),
    });
  });

  await page.goto("/#/widget");
  await page.getByRole("button", { name: "Evaluate Potential Issues" }).click();

  await expect(page.getByText("Potential Issues Evaluation")).toBeVisible();
  await expect(page.getByText("North Valley")).toBeVisible();
});

test("start fresh resets the widget", async ({ page }) => {
  await page.route("**/api/agent-chat", async (route) => {
    const responseBody = sseResponse("Reset response", {
      conversationId: "session-reset",
      conversationSk: 999,
      turnNumber: 1,
    });
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: responseBody,
    });
  });

  await page.goto("/#/widget");
  await page.getByPlaceholder("Ask anything...").fill("Trigger reset");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Reset response")).toBeVisible();

  await page.getByRole("button", { name: /start fresh/i }).click();
  await expect(
    page.getByText("I'm ready to help. You can ask me about the issues I found, or detailed questions about specific positions.")
  ).toBeVisible();
});
