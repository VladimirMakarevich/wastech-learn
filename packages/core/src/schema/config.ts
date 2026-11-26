import { z } from "zod";

export const UI_LANGUAGES = ["ru", "en", "pl"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

/** Every model the pinned ts-fsrs ships with `DefaultScheduler`; tests and simulation only cover FSRS-7. */
export const FSRS_MODELS = ["FSRS-7", "FSRS-6"] as const;

const isTimeZone = (zone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    // Intl rejects an unknown zone with a RangeError; that is the answer, not a failure.
    return false;
  }
};

// The scheduler accepts fractional and zero steps, but a zero or fractional step in a hand-edited config
// is a typo rather than an intent, so only whole positive minutes, hours or days pass.
const stepSchema = z
  .templateLiteral([z.number(), z.enum(["m", "h", "d"])])
  .refine((step) => /^[1-9]\d*[mhd]$/.test(step), {
    error: "Expected a whole positive step such as 1m, 10m, 1h or 1d",
  });

const srsSchema = z.strictObject({
  scheduler: z.string().regex(/^ts-fsrs@\d+\.\d+\.\d+$/),
  model: z.enum(FSRS_MODELS),
  desiredRetention: z.number().gt(0).lt(1),
  maxIntervalDays: z.int().positive(),
  learningSteps: z.array(stepSchema),
  relearningSteps: z.array(stepSchema),
  allowModelOverride: z.boolean(),
  graduatingIntervalDays: z.int().positive(),
  fuzz: z.boolean(),
  weights: z.array(z.number()).nullable(),
});

const domainLimitsSchema = z.strictObject({
  newPerDay: z.int().nonnegative(),
  reviewsPerDay: z.int().positive(),
});

// In the file a domain's limits sit next to the global keys (`"lang-pl": { ... }`), which reads well but
// types badly; parsing moves them under `domains`, so code never confuses a domain with a setting.
const limitsSchema = z
  .object({
    default: domainLimitsSchema,
    sessionMinutes: z.int().positive(),
    pauseNewWhenBacklogOver: z.number().positive(),
  })
  .catchall(domainLimitsSchema)
  .transform(
    ({
      default: fallback,
      sessionMinutes,
      pauseNewWhenBacklogOver,
      ...domains
    }) => ({
      default: fallback,
      domains,
      sessionMinutes,
      pauseNewWhenBacklogOver,
    }),
  );

/** `learn.config.json`: everything about scheduling and limits that is not content. */
export const learnConfigSchema = z.strictObject({
  timezone: z
    .string()
    .refine(isTimeZone, { error: "Expected an IANA time zone" }),
  dayStartsAt: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Expected HH:MM" }),
  uiLanguage: z.enum(UI_LANGUAGES),
  srs: srsSchema,
  limits: limitsSchema,
  leechThreshold: z.int().positive(),
});

export type DomainLimits = z.infer<typeof domainLimitsSchema>;
export type LearnConfig = z.infer<typeof learnConfigSchema>;
export type SrsSettings = LearnConfig["srs"];

/**
 * `learn.local.json`: settings of this machine only, never committed. The device names the folder this
 * machine's writers append to, so it has to be a safe path segment.
 */
export const learnLocalSchema = z.strictObject({
  device: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, {
    error: "Expected lower-case letters, digits and dashes",
  }),
});

export type LearnLocal = z.infer<typeof learnLocalSchema>;

/**
 * Derives a device name from a hostname when `learn.local.json` is missing. Hostnames carry dots, upper
 * case and domain suffixes (`Desk-1.local`); the device is a folder name in a shared git repository, so
 * it is reduced to the first label in lower case with anything else turned into dashes.
 */
export const deviceFromHostname = (hostname: string): string => {
  const label = (hostname.split(".")[0] ?? "").toLowerCase();
  const device = label
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return device === "" ? "device" : device;
};
