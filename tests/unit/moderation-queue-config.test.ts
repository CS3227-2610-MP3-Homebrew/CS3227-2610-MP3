// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { queueSize } from "@/server/reviews/queue-config";

afterEach(() => vi.unstubAllEnvs());

describe("moderation queue configuration", () => {
  test("accepts every bounded digit string and retains leading-zero compatibility", () => {
    for (let size = 1; size <= 20; size++) {
      for (const setting of [String(size), String(size).padStart(4, "0")]) {
        vi.stubEnv("AI_MODERATION_REVIEWS_PER_CALL", setting);
        expect(queueSize()).toBe(size);
      }
    }
  });

  test("rejects missing malformed and out-of-range policy with only a safe error", () => {
    for (const setting of [undefined, "", "0", "000", "21", "-1", "+7", "7.0", "7.5", "1e1", "0x7", " 7", "7 ", "7\n8", "NaN", "Infinity", "9007199254740992", "9".repeat(400), "secret-canary"]) {
      vi.stubEnv("AI_MODERATION_REVIEWS_PER_CALL", setting);
      expect(() => queueSize()).toThrowError(/^Queue configuration unavailable\.$/);
    }
  });

  test("reads current policy per call and recovers after rejected configuration", () => {
    vi.stubEnv("AI_MODERATION_REVIEWS_PER_CALL", "7");
    expect(queueSize()).toBe(7);
    vi.stubEnv("AI_MODERATION_REVIEWS_PER_CALL", "invalid");
    expect(() => queueSize()).toThrowError("Queue configuration unavailable.");
    vi.stubEnv("AI_MODERATION_REVIEWS_PER_CALL", "20");
    expect(queueSize()).toBe(20);
  });
});
