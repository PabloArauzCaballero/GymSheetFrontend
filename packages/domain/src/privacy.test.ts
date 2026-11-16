import { currentLegalDocumentsSchema } from "@gymsheet/schemas";
import { describe, expect, it } from "vitest";
import {
  accountExportPollInterval,
  accountSuspensionCopy,
  accountSuspensionOf,
  closureProofOptions,
  exportRetryAfterSeconds,
  isAccountExportDownloadable,
  waitLabel,
} from "./account-rights";
import { identityErrorMessage } from "./account-security";
import { outdatedCurrentDocuments, signupLegalDocuments, termsVersionOf } from "./legal";
import {
  consentInput,
  consentRequiredKind,
  currentConsentVersion,
  isConsentActive,
  isSocialMapDisabled,
  outdatedConsentVersion,
  consentKindOrder,
  settingsConsents,
} from "./privacy";

describe("consents", () => {
  it("reads the kind a 400 CONSENT_REQUIRED asks for, and nothing else", () => {
    expect(consentRequiredKind({ code: "CONSENT_REQUIRED", details: { kind: "ORIENTATION" } })).toBe("ORIENTATION");
    expect(consentRequiredKind({ code: "CONSENT_REQUIRED", details: { kind: "MARKETING" } })).toBeNull();
    expect(consentRequiredKind({ code: "SOCIAL_MAP_DISABLED" })).toBeNull();
    expect(consentRequiredKind(new Error("boom"))).toBeNull();
  });

  it("is active only when granted to the current text", () => {
    expect(isConsentActive({ granted: true, upToDate: true })).toBe(true);
    expect(isConsentActive({ granted: true, upToDate: false })).toBe(false);
    expect(isConsentActive(undefined)).toBe(false);
  });

  it("takes the current version from /me/consents or /legal/current", () => {
    expect(currentConsentVersion([{ kind: "HEALTH", currentVersion: "2026-12-01" }], "HEALTH")).toBe("2026-12-01");
    expect(currentConsentVersion([{ kind: "HEALTH", version: "2026-12-02" }], "HEALTH")).toBe("2026-12-02");
    expect(currentConsentVersion([], "HEALTH")).toBeUndefined();
  });

  it("builds the PUT body: a grant names its version, a revocation none", () => {
    expect(consentInput(true, "2026-12-01")).toEqual({ granted: true, version: "2026-12-01" });
    expect(consentInput(false)).toEqual({ granted: false });
    expect(() => consentInput(true)).toThrow();
    expect(outdatedConsentVersion({ kind: "HEALTH", currentVersion: "2027-01-01" })).toBe("2027-01-01");
  });

  it("lists in settings every kind, the selfie included, in the backend order", () => {
    const listed = settingsConsents(
      (["PRECISE_LOCATION", "VERIFICATION_SELFIE", "ORIENTATION", "HEALTH"] as const).map((kind) => ({ kind })),
    );
    expect(listed.map((consent) => consent.kind)).toEqual([...consentKindOrder]);
    expect(listed.map((consent) => consent.kind)).toContain("VERIFICATION_SELFIE");
  });

  it("recognizes the closed social map", () => {
    expect(isSocialMapDisabled({ code: "SOCIAL_MAP_DISABLED" })).toBe(true);
    expect(isSocialMapDisabled({ code: "EMAIL_VERIFICATION_REQUIRED" })).toBe(false);
  });
});

describe("legal documents with the community rules", () => {
  const backend = {
    documents: [
      { document: "COMMUNITY", version: "2026-08-25", contentSha256: null },
      { document: "TERMS", version: "2026-08-25", contentSha256: null },
      { document: "PRIVACY", version: "2026-08-25", contentSha256: "ab12" },
    ],
    consents: [{ kind: "HEALTH", version: "2026-12-01" }],
  };

  it("parses GET /legal/current with COMMUNITY and the consent versions", () => {
    const parsed = currentLegalDocumentsSchema.parse(backend);
    expect(parsed.consents).toEqual([{ kind: "HEALTH", version: "2026-12-01" }]);
    expect(termsVersionOf(parsed.documents)).toBe("2026-08-25");
    expect(signupLegalDocuments(parsed.documents).map((entry) => entry.document)).toEqual([
      "TERMS",
      "PRIVACY",
      "COMMUNITY",
    ]);
  });

  it("keeps a 409 listing COMMUNITY instead of discarding it", () => {
    expect(outdatedCurrentDocuments({ documents: backend.documents })).toHaveLength(3);
  });
});

describe("account rights", () => {
  it("offers the PIN only to Google/Apple accounts", () => {
    expect(closureProofOptions({ proof: { password: true, emailPin: false } })).toEqual(["password"]);
    expect(closureProofOptions({ proof: { password: true, emailPin: true } })).toEqual(["password", "pin"]);
  });

  it("polls while the export is pending and stops once it settles", () => {
    expect(accountExportPollInterval({ status: "PENDING" })).toBeGreaterThan(0);
    expect(accountExportPollInterval({ status: "READY" })).toBe(false);
    expect(accountExportPollInterval({ status: "FAILED" })).toBe(false);
    expect(isAccountExportDownloadable({ status: "READY", downloadPath: "/me/export/x/download" })).toBe(true);
    expect(isAccountExportDownloadable({ status: "READY", downloadPath: null })).toBe(false);
  });

  it("says how long to wait before another export", () => {
    expect(exportRetryAfterSeconds({ retryAfterSeconds: 82_800 })).toBe(82_800);
    expect(exportRetryAfterSeconds({})).toBeNull();
    expect(waitLabel(82_800)).toBe("23 h");
    expect(waitLabel(90)).toBe("2 min");
    expect(waitLabel(5)).toBe("1 min");
  });
});

describe("account suspension by code", () => {
  it("reads a pending review and a dated suspension from ACCOUNT_SUSPENDED", () => {
    expect(accountSuspensionOf({ code: "ACCOUNT_SUSPENDED", details: { pendingReview: true } })).toEqual({
      pendingReview: true,
      until: null,
    });
    expect(
      accountSuspensionOf({ code: "ACCOUNT_SUSPENDED", details: { pendingReview: false, until: "2026-12-01T00:00:00.000Z" } }),
    ).toEqual({ pendingReview: false, until: "2026-12-01T00:00:00.000Z" });
  });

  it("ignores the wording: a 401 that only says «suspendida» is not a suspension", () => {
    expect(accountSuspensionOf({ code: undefined, message: "Tu cuenta está suspendida" })).toBeNull();
    expect(accountSuspensionOf({ code: "UNAUTHORIZED" })).toBeNull();
  });

  it("words each case, never naming year 9999", () => {
    expect(accountSuspensionCopy.message({ pendingReview: true, until: null })).toMatch(/mientras revisamos un reporte/u);
    expect(accountSuspensionCopy.message({ pendingReview: false, until: "2026-12-01T12:00:00.000Z" })).toMatch(/2026/u);
    expect(accountSuspensionCopy.message({ pendingReview: false, until: null })).toBe(accountSuspensionCopy.undated);
  });

  it("Google/Apple sign-in says the suspension too", () => {
    expect(identityErrorMessage("Google", { code: "ACCOUNT_SUSPENDED", status: 403, details: { pendingReview: true } })).toBe(
      accountSuspensionCopy.pendingReview,
    );
  });
});
