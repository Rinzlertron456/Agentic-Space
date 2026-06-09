import { describe, expect, it } from "vitest";
import { shouldStopForSensitiveGate } from "../src/runner/playwright";

describe("browser safety gates", () => {
  it("stops on CAPTCHA and payment prompts", () => {
    expect(shouldStopForSensitiveGate("Please solve captcha before applying")).toBe(true);
    expect(shouldStopForSensitiveGate("Enter credit card details")).toBe(true);
  });

  it("allows ordinary job text", () => {
    expect(shouldStopForSensitiveGate("Upload resume and answer screening questions")).toBe(false);
  });
});
