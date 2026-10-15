import { createHash } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { apiData } from "./web-chat-driver.mjs";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

class PreconditionError extends Error {}

export function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!key?.startsWith("--") || !args[index + 1])
      throw new Error("invalid driver arguments");
    values[key.slice(2)] = args[index + 1];
  }
  for (const key of ["case", "role", "run-id", "evidence-dir"]) {
    if (!values[key]) throw new Error(`missing ${key}`);
  }
  return {
    caseId: values.case,
    role: values.role,
    runId: values["run-id"],
    evidenceDir: values["evidence-dir"],
  };
}

export function calendarUid(ics) {
  if (
    typeof ics !== "string" ||
    !ics.startsWith("BEGIN:VCALENDAR\r\n") ||
    !ics.endsWith("END:VCALENDAR\r\n")
  ) {
    throw new Error("calendar is not a complete VCALENDAR");
  }
  const unfolded = ics.replace(/\r\n[ \t]/gu, "");
  const uids = [...unfolded.matchAll(/(?:^|\r\n)UID:([^\r\n]+)/gu)].map(
    (match) => match[1],
  );
  if (uids.length !== 1 || !uids[0]?.trim())
    throw new Error("calendar must contain exactly one UID");
  return uids[0];
}

async function fetchCalendar(apiBase, token, inviteId) {
  const response = await fetch(
    `${apiBase.replace(/\/$/u, "")}/me/training-invitations/${inviteId}/calendar.ics`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/calendar" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (
    !response.ok ||
    !(response.headers.get("content-type") ?? "").includes("text/calendar")
  ) {
    throw new Error(`calendar API unavailable (${response.status})`);
  }
  return calendarUid(await response.text());
}

export async function run(options, env = process.env) {
  if (options.caseId !== "H10.S3.M3" || options.role !== "A_WEB")
    throw new Error("unsupported case or role");
  if (!/^[A-Za-z0-9_-]{1,80}$/u.test(options.runId))
    throw new Error("invalid run ID");
  const token = env.QA_TOKEN_A;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  const inviteId = env.QA_H10_DISPOSABLE_INVITATION_ID;
  if (!token || !apiBase || !webBase || !inviteId)
    throw new PreconditionError(
      "H10.S3.M3 requires QA A credentials, API/web bases, and QA_H10_DISPOSABLE_INVITATION_ID",
    );
  if (!uuid.test(inviteId))
    throw new Error("QA_H10_DISPOSABLE_INVITATION_ID must be a UUID");

  const own = await apiData(apiBase, token, "/auth/me");
  const invitations = await apiData(apiBase, token, "/me/training-invitations");
  const invitation = Array.isArray(invitations)
    ? invitations.find((item) => item?.id === inviteId)
    : null;
  if (!own?.id || !invitation?.meeting)
    throw new Error(
      "QA invitation must belong to actor A and have a materialized meeting",
    );
  const initial = await fetchCalendar(apiBase, token, inviteId);
  const webUrl = new URL("/entrenar-juntos", webBase);
  if (
    !["http:", "https:"].includes(webUrl.protocol) ||
    webUrl.username ||
    webUrl.password
  )
    throw new Error("invalid web base URL");

  let browser;
  const screenshot = path.resolve(
    options.evidenceDir,
    `H10.S3.M3-A_WEB-${options.runId}.png`,
  );
  let success = false;
  try {
    browser = await chromium.launch({ headless: true, timeout: 20_000 });
    const context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      acceptDownloads: true,
    });
    await context.addCookies([
      {
        name: "gymsheet_session",
        value: token,
        url: new URL("/", webBase).toString(),
        httpOnly: true,
        secure: webUrl.protocol === "https:",
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto(webUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const skipWelcomeTour = page.getByRole("button", {
      name: "Omitir",
      exact: true,
    });
    if (
      await skipWelcomeTour
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await skipWelcomeTour.click({ timeout: 5_000 });
    }
    const card = page.getByTestId(`training-invitation-${inviteId}`);
    await card.waitFor({ state: "visible", timeout: 20_000 });
    const button = card.getByRole("button", {
      name: "Descargar calendario (.ics)",
    });
    if (!(await button.isVisible()))
      throw new Error("calendar export action is not visible");

    const exportedUids = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const downloadPromise = page.waitForEvent("download", {
        timeout: 15_000,
      });
      await button.click({ timeout: 10_000 });
      const download = await downloadPromise;
      const localPath = await download.path();
      if (!localPath)
        throw new Error("calendar download did not produce a local file");
      exportedUids.push(
        calendarUid((await readFile(localPath)).toString("utf8")),
      );
    }
    const latest = await fetchCalendar(apiBase, token, inviteId);
    if (exportedUids.some((uid) => uid !== initial) || latest !== initial)
      throw new Error("calendar UID changed across repeated web exports");
    await writeFile(screenshot, Buffer.alloc(0), { flag: "wx", mode: 0o600 });
    await page.screenshot({
      path: screenshot,
      fullPage: true,
      timeout: 10_000,
    });
    await chmod(screenshot, 0o600);
    success = true;
    const bytes = await readFile(screenshot);
    return {
      runId: options.runId,
      case: options.caseId,
      role: options.role,
      apiActorId: own.id,
      assertions: { calendarExportRetainsStableUid: true },
      observations: {
        uid: initial,
        invitationId: inviteId,
        repeatedWebExports: exportedUids.length,
      },
      artifacts: [
        {
          path: screenshot,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ],
    };
  } finally {
    if (browser) await browser.close();
    if (!success) await rm(screenshot, { force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    process.stdout.write(
      `${JSON.stringify(await run(parseArgs(process.argv.slice(2))))}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error?.message ?? "H10.S3.M3 web driver failed"}\n`,
    );
    process.exitCode = error instanceof PreconditionError ? 2 : 1;
  }
}
