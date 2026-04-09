import { afterEach, describe, expect, it } from "vitest";
import { getHostPageContext } from "../useHostPageContext";

describe("getHostPageContext", () => {
  const originalPath = `${window.location.pathname}${window.location.search}`;

  afterEach(() => {
    window.history.replaceState({}, "", originalPath || "/");
  });

  it("does not fall back to a demo district when districtId is missing", () => {
    window.history.replaceState({}, "", `${window.location.pathname || "/"}?userId=demo-user`);

    expect(getHostPageContext().districtId).toBe("");
  });

  it("reads host page context from query params", () => {
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname || "/"}?districtId=364&districtName=Elsberry%20R-II&quarter=Q2&year=2025&userId=user-1`
    );

    expect(getHostPageContext()).toMatchObject({
      districtId: "364",
      districtName: "Elsberry R-II",
      quarter: "Q2",
      year: "2025",
      userId: "user-1",
    });
  });
});
