import { relative } from "node:path";
import {
  UI_LANGUAGES,
  learnConfigSchema,
  learnLocalSchema,
  type UiLanguage,
} from "@wastech-learn/core";
import {
  frameworkLayout,
  initRepository,
  type InitReport,
  type SkillInstallStatus,
} from "@wastech-learn/content-fs";
import {
  EXIT,
  UsageError,
  translator,
  type CommandContext,
  type ExitCode,
} from "./context.js";
import { FRAMEWORK_DIR } from "./framework.js";

type Translate = ReturnType<typeof translator>;

const stringOption = (
  ctx: CommandContext,
  name: string,
): string | undefined => {
  const value = ctx.values[name];
  return typeof value === "string" ? value : undefined;
};

const badValue = (option: string, value: string): UsageError =>
  new UsageError("cli.error.bad-value", { option, value });

const deviceOption = (ctx: CommandContext): string | undefined => {
  const device = stringOption(ctx, "device");
  if (device === undefined) return undefined;
  if (!learnLocalSchema.shape.device.safeParse(device).success)
    throw badValue("--device", device);
  return device;
};

const timezoneOption = (ctx: CommandContext): string => {
  const timezone = stringOption(ctx, "timezone") ?? ctx.io.system.timeZone;
  if (!learnConfigSchema.shape.timezone.safeParse(timezone).success)
    throw badValue("--timezone", timezone);
  return timezone;
};

const asUiLanguage = (value: string | undefined): UiLanguage | undefined =>
  UI_LANGUAGES.find((lang) => lang === value);

// The interface speaks the language the learner asked the CLI to speak, else the system's; English is
// the fallback for a system in a language the app does not have.
const uiLanguageOption = (ctx: CommandContext): UiLanguage => {
  const raw = stringOption(ctx, "ui-language");
  if (raw !== undefined) {
    const lang = asUiLanguage(raw);
    if (lang === undefined) throw badValue("--ui-language", raw);
    return lang;
  }
  return (
    asUiLanguage(stringOption(ctx, "lang")) ??
    asUiLanguage(ctx.io.system.locale.split("-")[0]) ??
    "en"
  );
};

// One line per outcome rather than per skill and folder: a skill is reported as installed or updated
// when either agent folder got it, and only a copy kept back is named with its folder.
const printSkills = (
  ctx: CommandContext,
  t: Translate,
  report: InitReport,
): void => {
  // A copy kept back says the most, then a fresh copy, then an update; "current" only when both are.
  const outcomeOf = (skill: string): SkillInstallStatus => {
    const statuses = report.skills
      .filter((install) => install.skill === skill)
      .map((install) => install.status);
    return (
      (["kept", "installed", "updated"] as const).find((status) =>
        statuses.includes(status),
      ) ?? "current"
    );
  };
  const skills = [...new Set(report.skills.map((install) => install.skill))];
  const lines = [
    ["cli.init.skills-installed", "installed"],
    ["cli.init.skills-updated", "updated"],
    ["cli.init.skills-current", "current"],
  ] as const;
  for (const [key, status] of lines) {
    const named = skills.filter((skill) => outcomeOf(skill) === status);
    if (named.length > 0) ctx.io.out(t(key, { skills: named.join(", ") }));
  }
  for (const install of report.skills) {
    if (install.status === "kept")
      ctx.io.out(
        t("cli.init.skill-kept", { skill: install.skill, dir: install.dir }),
      );
  }
};

// A path with a space would split in the shell the learner pastes the next step into.
const shellPath = (path: string): string =>
  /\s/.test(path) ? JSON.stringify(path) : path;

const printReport = (
  ctx: CommandContext,
  t: Translate,
  report: InitReport,
): void => {
  ctx.io.out(t("cli.init.done", { root: ctx.root }));
  if (report.created.length > 0)
    ctx.io.out(
      t("cli.init.created", {
        files: t("count.files", { count: report.created.length }),
      }),
    );
  for (const file of report.kept) ctx.io.out(t("cli.init.kept", { file }));
  ctx.io.out(
    report.config.written
      ? t("cli.init.config", {
          timezone: report.config.timezone,
          language: report.config.uiLanguage,
        })
      : t("cli.init.config-kept"),
  );
  ctx.io.out(
    t(report.device.written ? "cli.init.device" : "cli.init.device-kept", {
      device: report.device.name,
    }),
  );
  printSkills(ctx, t, report);
  // The rest needs the network and the learner's consent, so init only names it.
  const steps = [
    ...(relative(ctx.io.cwd, ctx.root) === ""
      ? []
      : [`cd ${shellPath(ctx.root)}`]),
    ...(report.hasGit ? [] : ["git init -b main"]),
    "npm install",
    "npx wastech-learn doctor",
  ];
  ctx.io.out("");
  ctx.io.out(t("cli.init.next"));
  for (const step of steps) ctx.io.out(`  ${step}`);
};

// A few names are enough to recognize the wrong folder; a home directory would list hundreds.
const MAX_LISTED = 5;

/**
 * `wastech-learn init`: creates a content repository from the framework's template, or completes an
 * existing one and brings its skills up to date. It never overwrites a file and never runs git or npm.
 */
export const runInit = async (ctx: CommandContext): Promise<ExitCode> => {
  const uiLanguage = uiLanguageOption(ctx);
  const timezone = timezoneOption(ctx);
  const device = deviceOption(ctx);
  const outcome = await initRepository({
    root: ctx.root,
    framework: frameworkLayout(FRAMEWORK_DIR),
    timezone,
    uiLanguage,
    hostname: () => ctx.io.system.hostname,
    ...(device === undefined ? {} : { device }),
  });
  // A repository that is new gets its first messages in the language it was just given.
  const speaksOwnLanguage =
    stringOption(ctx, "lang") !== undefined ||
    (outcome.kind === "done" && !outcome.report.config.written);
  const t = speaksOwnLanguage ? ctx.t : translator(uiLanguage);
  if (outcome.kind === "refused") {
    const listed = outcome.foreign.slice(0, MAX_LISTED);
    const entries =
      outcome.foreign.length > MAX_LISTED
        ? `${listed.join(", ")}, …`
        : listed.join(", ");
    ctx.io.err(t("cli.init.refused", { root: ctx.root, entries }));
    return EXIT.failure;
  }
  printReport(ctx, t, outcome.report);
  return EXIT.clean;
};
