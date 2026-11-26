import { describe, expect, it } from "vitest";
import {
  deviceFromHostname,
  firstIssue,
  learnConfigSchema,
  learnLocalSchema,
} from "../src/index.js";

const goldenConfig = {
  timezone: "Europe/Warsaw",
  dayStartsAt: "04:00",
  uiLanguage: "ru",
  srs: {
    scheduler: "ts-fsrs@6.0.1",
    model: "FSRS-7",
    desiredRetention: 0.9,
    maxIntervalDays: 365,
    learningSteps: ["1m", "10m"],
    relearningSteps: ["10m"],
    allowModelOverride: true,
    graduatingIntervalDays: 1,
    fuzz: true,
    weights: null,
  },
  limits: {
    default: { newPerDay: 10, reviewsPerDay: 150 },
    "lang-pl": { newPerDay: 10, reviewsPerDay: 150 },
    sessionMinutes: 15,
    pauseNewWhenBacklogOver: 2.0,
  },
  leechThreshold: 8,
};

const issueOf = (input: unknown) => {
  const parsed = learnConfigSchema.safeParse(input);
  if (parsed.success) throw new Error("expected the config to be rejected");
  return firstIssue(parsed.error);
};

describe("learn.config.json schema", () => {
  it("accepts the golden config and moves domain limits under domains", () => {
    const config = learnConfigSchema.parse(goldenConfig);
    expect(config.limits.default).toEqual({
      newPerDay: 10,
      reviewsPerDay: 150,
    });
    expect(config.limits.domains).toEqual({
      "lang-pl": { newPerDay: 10, reviewsPerDay: 150 },
    });
    expect(config.limits.sessionMinutes).toBe(15);
    expect(config.srs.learningSteps).toEqual(["1m", "10m"]);
  });

  it("names srs.desiredRetention when the retention is not a probability", () => {
    const issue = issueOf({
      ...goldenConfig,
      srs: { ...goldenConfig.srs, desiredRetention: 1.5 },
    });
    expect(issue.field).toBe("srs.desiredRetention");
  });

  it("rejects an unknown time zone", () => {
    expect(issueOf({ ...goldenConfig, timezone: "Mars/Olympus" }).field).toBe(
      "timezone",
    );
  });

  it("rejects a day boundary that is not HH:MM", () => {
    expect(issueOf({ ...goldenConfig, dayStartsAt: "4am" }).field).toBe(
      "dayStartsAt",
    );
  });

  it("rejects a zero or fractional learning step", () => {
    const zero = issueOf({
      ...goldenConfig,
      srs: { ...goldenConfig.srs, learningSteps: ["0m"] },
    });
    expect(zero.field).toBe("srs.learningSteps[0]");
    const fraction = {
      ...goldenConfig,
      srs: { ...goldenConfig.srs, relearningSteps: ["1.5m"] },
    };
    expect(issueOf(fraction).field).toBe("srs.relearningSteps[0]");
  });

  it("rejects a misspelled key instead of ignoring it", () => {
    const { leechThreshold, ...rest } = goldenConfig;
    expect(issueOf({ ...rest, leechTreshold: leechThreshold }).field).not.toBe(
      "",
    );
  });

  it("names the domain whose limits are malformed", () => {
    const limits = {
      ...goldenConfig.limits,
      dotnet: { newPerDay: -1, reviewsPerDay: 100 },
    };
    expect(issueOf({ ...goldenConfig, limits }).field).toBe(
      "limits.dotnet.newPerDay",
    );
  });
});

describe("learn.local.json schema", () => {
  it("accepts a device name that is a safe folder name", () => {
    expect(learnLocalSchema.parse({ device: "desk1" })).toEqual({
      device: "desk1",
    });
  });

  it("rejects a device name that would escape its folder", () => {
    expect(learnLocalSchema.safeParse({ device: "../desk" }).success).toBe(
      false,
    );
  });
});

describe("deviceFromHostname", () => {
  it("keeps the first label in lower case", () => {
    expect(deviceFromHostname("Desk-1.local")).toBe("desk-1");
  });

  it("turns characters a folder name should not hold into dashes", () => {
    expect(deviceFromHostname("Vladi's MacBook")).toBe("vladi-s-macbook");
  });

  it("falls back to a fixed name when nothing usable is left", () => {
    expect(deviceFromHostname("...")).toBe("device");
  });
});
