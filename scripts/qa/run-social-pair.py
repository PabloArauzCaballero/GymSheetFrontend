#!/usr/bin/env python3
"""H1/H3.S2/H4/H5/H7.S4/H8/H9/H10/H11 pair QA coordinator. Never substitutes API checks for device evidence.

Usage: python3 scripts/qa/run-social-pair.py --phase H1
       python3 scripts/qa/run-social-pair.py --phase H7
       python3 scripts/qa/run-social-pair.py --phase H5
       python3 scripts/qa/run-social-pair.py --phase H3
       python3 scripts/qa/run-social-pair.py --phase H4
       python3 scripts/qa/run-social-pair.py --phase H8
       python3 scripts/qa/run-social-pair.py --phase H9
       python3 scripts/qa/run-social-pair.py --phase H10
       python3 scripts/qa/run-social-pair.py --phase H11
       python3 scripts/qa/run-social-pair.py --case H1.S3.M1 --output /tmp/h1.json
       python3 scripts/qa/run-social-pair.py --case H7.S4.M1 --output /tmp/h7.json

Private inputs: QA_TOKEN_A/B/C, QA_ANDROID_SERIAL, QA_IOS_UDID,
QA_API_BASE_URL (include /api/v1), QA_WEB_BASE_URL. Tokens are never logged.
Exit 0 means all selected cases PASS; 2 means BLOCKED; 1 means FAIL/invalid input.
Drivers are fixed files in scripts/qa/drivers, never commands from environment.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import platform
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pair_barrier import DEFAULT_TIMEOUT_SECONDS, create_barrier_dir

ROOT = pathlib.Path(__file__).resolve().parents[2]
DRIVER_TIMEOUT_SECONDS = DEFAULT_TIMEOUT_SECONDS + 90
REPOS = {"frontend": ROOT, "backend": ROOT.parent / "GymSheetBackend",
         "recommendations": ROOT.parent / "GymSheetRecommendations"}
CASES = {
    "H1.S3.M1": "Android A and iOS B show isolated profiles",
    "H1.S3.M2": "isolated web A shows persistent A state",
    "H1.S3.M3": "simultaneous captures and recording share runId",
    "H1.S3.M4": "A's permitted change survives client restart and API reload",
    "H3.S2.M1": "accepting a received request creates a connection and chat entry for both users",
    "H3.S2.M2": "withdrawing a pending request removes it without creating a chat",
    "H3.S2.M3": "undoing a discard restores the candidate while preserving blocks",
    "H3.S2.M4": "connection status stays synchronized across profile surfaces",
    "H4.E1": "observed recommendation feedback affects soft affinity and undo or block retracts it across clients",
    "H5.S1.M1": "invalid discovery response shows recoverable error",
    "H5.S1.M2": "empty eligible deck explains filters without invented people",
    "H5.S1.M3": "conflicted swipe reconciles authoritative deck",
    "H5.S1.M4": "returning to discovery restarts an expired cursor",
    "H5.S2.M1": "keyboard action and gesture produce the same connection request",
    "H5.S2.M2": "changed preferences refresh the discovery deck",
    "H5.S2.M3": "flexible range is disclosed and can return to preferred range",
    "H5.S2.M4": "simultaneous decisions open one accessible match chat per client",
    "H7.S4.M1": "denied microphone permission preserves text composition",
    "H7.S4.M2": "Android audio duration and playback match on iOS and web",
    "H7.S4.M3": "message edit is visible across iOS and web clients",
    "H7.S4.M4": "read receipt scope synchronizes across Android, iOS, and web",
    "H7.S4.M5": "revoked chat history and media clear on foreground",
    "H8.S1.M1": "authorized cross-gym story is visible to its connection",
    "H8.S1.M2": "selected audience reaches B but excludes connected C",
    "H8.S1.M3": "expired story link no longer opens the story",
    "H8.S1.M4": "only the story owner can see its viewer list",
    "H8.S2.M1": "retrying a story reaction creates one chat message",
    "H8.S2.M2": "story reply reaches the owner with its reference",
    "H8.S2.M3": "unavailable story reference preserves reply text",
    "H8.S2.M4": "reaction after disconnect creates no chat",
    "H8.S3.M1": "selected story audience persists across client reloads",
    "H8.S3.M2": "story playback stays paused after foreground return",
    "H8.S3.M3": "retrying a failed story upload creates one story",
    "H8.S3.M4": "deleting a viewed story removes it from the active viewer",
    "H8.S4.M1": "story migration preserves legacy data and enforces constraints",
    "H8.S4.M2": "empty database migrations load the story fixture",
    "H9.S1.M1": "server validates final reel duration at 90 seconds",
    "H9.S1.M2": "interrupted reel upload never enters the visible feed",
    "H9.S1.M3": "processing retry is idempotent and leaves no orphan media",
    "H9.S1.M4": "invalid video content is rejected without execution",
    "H9.S2.M1": "connections feed contains only authorized reels",
    "H9.S2.M2": "saved reels remain private to their owner",
    "H9.S2.M3": "reposts deduplicate by original reel",
    "H9.S2.M4": "undoing a repost preserves its original reel",
    "H9.S2.M5": "closed comments reject new participation",
    "H9.S2.M6": "deleted reels disappear from saved and reposted collections",
    "H9.S3.M1": "trimmed reel uses the selected cover on mobile and web",
    "H9.S3.M2": "camera and file uploads reach READY with correct preview",
    "H9.S3.M3": "only the active visible reel plays",
    "H9.S3.M4": "author connection status matches discovery and map",
    "H9.S3.M5": "comment reply and like persist on the reel",
    "H9.S3.M6": "author removes only the selected comment for both users",
    "H9.S4.M1": "reel migration preserves compatible existing data",
    "H9.S4.M2": "empty database migration loads the reel fixture",
    **{f"H10.S1.M{i}": description for i, description in enumerate((
        "only connected members can create training invitations",
        "training invitation stores its first public-place revision",
        "accepting an invitation creates one meeting and chat event",
        "counterproposal advances revision and stale acceptance conflicts",
        "expired invitation cannot be accepted",
        "disconnect cancels future meeting and revokes chat access",
    ), 1)},
    **{f"H10.S2.M{i}": description for i, description in enumerate((
        "own-routine mode preserves each participant workout",
        "shared-session mode shares only the agreed snapshot",
        "each participant keeps individual weights",
        "completion awards XP only to the participant who completed",
        "canceling a meeting preserves completed workout history",
    ), 1)},
    "H10.S3.M1": "profile and chat open the same invitation form",
    "H10.S3.M2": "participants see the agreed instant in their local time",
    "H10.S3.M3": "calendar export retry keeps the same UID",
    "H10.S3.M4": "calendar permission denial preserves internal agenda",
    "H10.S3.M5": "opening location uses the agreed place",
    "H10.S4.M1": "training migration preserves compatible legacy data",
    "H10.S4.M2": "empty database migrations load training fixture",
    "H11.S3.M1": "reporting a reel profile or message confirms one persistent case",
    "H11.S3.M2": "pausing a profile preserves its chat and hides it from discovery",
    "H11.S3.M3": "resuming a profile restores eligibility and preserves consent choices",
    "H11.S3.M4": "blocking from chat revokes both sessions and an old notification link",
}
CASE_ROLES = {"H1.S3.M1": ("A", "B"), "H1.S3.M2": ("A", "B", "WEB_A"),
              "H1.S3.M3": ("A", "B"), "H1.S3.M4": ("A",)}
CASE_ROLES.update({
    "H3.S2.M1": ("A_WEB", "B_WEB"),
    "H3.S2.M2": ("A_WEB", "B_WEB"),
    "H3.S2.M3": ("A_WEB", "B_WEB"),
    "H3.S2.M4": ("A_WEB",),
})
CASE_ROLES.update({"H4.E1": ("A_ANDROID", "A_IOS", "A_WEB")})
CASE_ROLES.update({
    **{f"H10.S1.M{i}": ("A_API", "B_API") for i in range(1, 7)},
    **{f"H10.S2.M{i}": ("A_API", "B_API") for i in range(1, 6)},
    "H10.S3.M1": ("A_ANDROID", "A_WEB"),
    "H10.S3.M2": ("A_ANDROID", "B_IOS", "B_WEB"),
    "H10.S3.M3": ("A_IOS", "A_WEB"),
    "H10.S3.M4": ("A_ANDROID", "A_IOS"),
    "H10.S3.M5": ("A_ANDROID", "A_WEB"),
    "H10.S4.M1": ("A_API",),
    "H10.S4.M2": ("A_API",),
    "H11.S3.M1": ("A_ANDROID", "A_IOS", "B_WEB"),
    "H11.S3.M2": ("A_ANDROID", "A_IOS", "B_WEB", "C_WEB"),
    "H11.S3.M3": ("A_ANDROID", "A_IOS", "B_WEB", "C_WEB"),
    "H11.S3.M4": ("A_ANDROID", "A_IOS", "B_IOS", "B_WEB"),
})
CASE_ROLES.update({
    "H7.S4.M1": ("A_ANDROID",),
    "H7.S4.M2": ("A_ANDROID", "B_IOS", "B_WEB"),
    "H7.S4.M3": ("A_IOS", "B_WEB"),
    "H7.S4.M4": ("A_ANDROID", "A_IOS", "A_WEB", "B_WEB"),
    "H7.S4.M5": ("A_ANDROID", "B_WEB"),
})
CASE_ROLES.update({
    "H5.S1.M1": ("A_WEB",),
    "H5.S1.M2": ("A_WEB",),
    "H5.S1.M3": ("A_WEB",),
    "H5.S1.M4": ("A_WEB",),
    "H5.S2.M1": ("A_ANDROID", "A_IOS", "A_WEB"),
    "H5.S2.M2": ("A_ANDROID", "A_IOS", "A_WEB"),
    "H5.S2.M3": ("A_ANDROID", "A_IOS", "A_WEB"),
    "H5.S2.M4": ("A_ANDROID", "B_IOS", "A_WEB", "B_WEB"),
})
CASE_ROLES.update({
    "H8.S1.M1": ("A_WEB", "B_WEB"),
    "H8.S1.M2": ("A_ANDROID", "B_WEB", "C_WEB"),
    "H8.S1.M3": ("A_WEB", "B_WEB"),
    "H8.S1.M4": ("A_ANDROID", "B_WEB", "C_WEB"),
    "H8.S2.M1": ("B_ANDROID", "A_WEB"),
    "H8.S2.M2": ("B_ANDROID", "A_WEB"),
    "H8.S2.M3": ("A_WEB", "B_WEB"),
    "H8.S2.M4": ("B_ANDROID", "A_WEB"),
    "H8.S3.M1": ("A_ANDROID", "B_WEB", "C_WEB"),
    "H8.S3.M2": ("A_ANDROID",),
    "H8.S3.M3": ("A_ANDROID", "B_WEB"),
    "H8.S3.M4": ("A_ANDROID", "B_IOS"),
    "H8.S4.M1": ("A_API",),
    "H8.S4.M2": ("A_API",),
})
CASE_ROLES.update({
    "H9.S1.M1": ("A_API",),
    "H9.S1.M2": ("A_API",),
    "H9.S1.M3": ("A_API",),
    "H9.S1.M4": ("A_API",),
    "H9.S2.M1": ("A_API", "B_API"),
    "H9.S2.M2": ("A_API", "B_API"),
    "H9.S2.M3": ("A_API", "B_API", "C_API"),
    "H9.S2.M4": ("A_API", "B_API"),
    "H9.S2.M5": ("A_API", "B_API"),
    "H9.S2.M6": ("A_API", "B_API", "C_API"),
    "H9.S3.M1": ("A_ANDROID", "A_WEB"),
    "H9.S3.M2": ("A_ANDROID", "A_WEB"),
    "H9.S3.M3": ("A_ANDROID", "A_WEB"),
    "H9.S3.M4": ("A_ANDROID", "A_WEB"),
    "H9.S3.M5": ("A_ANDROID", "B_WEB"),
    "H9.S3.M6": ("A_ANDROID", "B_WEB"),
    "H9.S4.M1": ("A_API",),
    "H9.S4.M2": ("A_API",),
})
CASE_ROLE_ACTORS = {
    "A": "A", "B": "B", "WEB_A": "A",
    "A_ANDROID": "A", "A_IOS": "A", "A_WEB": "A",
    "B_ANDROID": "B", "B_IOS": "B", "B_WEB": "B",
    "C_WEB": "C", "A_API": "A", "B_API": "B", "C_API": "C",
}
CASE_ROLE_DEVICES = {
    "A_ANDROID": "android", "B_ANDROID": "android",
    "A_IOS": "ios", "B_IOS": "ios",
    "A_WEB": "web", "B_WEB": "web",
    "C_WEB": "web", "A_API": "api", "B_API": "api", "C_API": "api",
}
CASE_ASSERTIONS = {"H1.S3.M1": "profileAccountMatchesApi",
                   "H1.S3.M2": "webAccountMatchesApi",
                   "H1.S3.M3": "simultaneousCapture",
                   "H1.S3.M4": "persistedAfterRestart"}
CASE_ASSERTIONS.update({
    "H3.S2.M1": "requestAcceptedConnectionVisible",
    "H3.S2.M2": "withdrawalRemovedWithoutChat",
    "H3.S2.M3": "discardUndoRestoredCandidate",
    "H3.S2.M4": "connectionStatusSyncedAcrossSurfaces",
    "H4.E1": "verifiedFeedbackAffectsAndRetractsPreference",
})
CASE_ASSERTIONS.update({
    **{f"H10.S1.M{i}": assertion for i, assertion in enumerate((
        "connectedMemberCanInvite", "firstRevisionPersisted", "meetingAndChatCreatedOnce",
        "counterproposalMakesOldRevisionConflict", "expiredInvitationCannotBeAccepted",
        "disconnectCancelsMeetingAndChatAccess",
    ), 1)},
    **{f"H10.S2.M{i}": assertion for i, assertion in enumerate((
        "ownRoutinesRemainIndependent", "onlyAgreedSnapshotShared", "weightsRemainIndividual",
        "xpAwardedOnlyToCompletingParticipant", "completedWorkoutSurvivesMeetingCancel",
    ), 1)},
    "H10.S3.M1": "profileAndChatUseSameInvitationForm",
    "H10.S3.M2": "agreedInstantShownInParticipantLocalTime",
    "H10.S3.M3": "calendarExportRetainsStableUid",
    "H10.S3.M4": "internalAgendaAvailableWithoutCalendarPermission",
    "H10.S3.M5": "locationOpensAgreedPlace",
    "H10.S4.M1": "legacyTrainingDataSurvivesMigration",
    "H10.S4.M2": "emptyDatabaseLoadsTrainingFixture",
    "H11.S3.M1": "reportFromResourceCreatesOnePersistentCase",
    "H11.S3.M2": "pausePreservesConnectionAndHidesFromDiscovery",
    "H11.S3.M3": "resumeRestoresEligibilityAndPreservesConsent",
    "H11.S3.M4": "blockRevokesChatAndOldNotificationLink",
})
CASE_ASSERTIONS.update({
    "H8.S1.M1": "authorizedStoryVisibleAcrossGyms",
    "H8.S1.M2": "selectedAudienceVisibleOnlyToRecipient",
    "H8.S1.M3": "expiredStoryUnavailable",
    "H8.S1.M4": "storyViewerListOwnerOnly",
    "H8.S2.M1": "storyReactionDeliveredExactlyOnce",
    "H8.S2.M2": "storyReplyDeliveredWithReference",
    "H8.S2.M3": "unavailableStoryReferencePreservesText",
    "H8.S2.M4": "disconnectedStoryReactionCreatesNoChat",
    "H8.S3.M1": "selectedAudienceSurvivesClientReload",
    "H8.S3.M2": "storyRemainsPausedAfterForeground",
    "H8.S3.M3": "storyUploadRetryCreatesSingleStory",
    "H8.S3.M4": "deletedStoryRemovedFromActiveViewer",
    "H8.S4.M1": "legacyStoriesSurviveMigration",
    "H8.S4.M2": "emptyDatabaseLoadsStoryFixture",
})
CASE_ASSERTIONS.update({
    "H9.S1.M1": "serverRejectsDurationAboveNinety",
    "H9.S1.M2": "interruptedUploadNeverVisible",
    "H9.S1.M3": "processingRetryCreatesNoDuplicates",
    "H9.S1.M4": "invalidVideoContentRejected",
    "H9.S2.M1": "connectionsFeedContainsAuthorizedReels",
    "H9.S2.M2": "savedReelsRemainPrivate",
    "H9.S2.M3": "repostsDeduplicatedByOriginalReel",
    "H9.S2.M4": "undoRepostPreservesOriginal",
    "H9.S2.M5": "closedCommentsRejectNewParticipation",
    "H9.S2.M6": "deletedReelUnavailableFromCollections",
    "H9.S3.M1": "trimmedReelUsesSelectedCover",
    "H9.S3.M2": "cameraAndFileReachReadyWithPreview",
    "H9.S3.M3": "onlyActiveVisibleReelPlays",
    "H9.S3.M4": "authorConnectionMatchesDiscoveryAndMap",
    "H9.S3.M5": "commentReplyLikePersisted",
    "H9.S3.M6": "authorDeletesOnlyTargetComment",
    "H9.S4.M1": "reelMigrationPreservesCompatibleData",
    "H9.S4.M2": "emptyDatabaseLoadsReelFixture",
})
CASE_ASSERTIONS.update({
    "H7.S4.M1": "microphoneDeniedTextAvailable",
    "H7.S4.M2": "audioDurationAndPlaybackMatch",
    "H7.S4.M3": "editVisibleAcrossClients",
    "H7.S4.M4": "readReceiptScopeSynced",
    "H7.S4.M5": "revokedChatClearedOnForeground",
})
CASE_ASSERTIONS.update({
    "H5.S1.M1": "discoveryContractErrorRecoverable",
    "H5.S1.M2": "discoveryEmptyExplained",
    "H5.S1.M3": "swipeConflictReconciled",
    "H5.S1.M4": "cursorFreeDeckReloaded",
    "H5.S2.M1": "keyboardSwipeMatchesGesture",
    "H5.S2.M2": "filtersRefreshDeck",
    "H5.S2.M3": "flexibleRangeDisclosed",
    "H5.S2.M4": "simultaneousMatchOpensChat",
})
CASE_ROLE_ASSERTIONS = {
    ("H7.S4.M3", "A_IOS"): ("editComposerFocusedAtSave",),
    ("H5.S1.M3", "A_WEB"): ("connectionSnapshotUnchanged",),
    ("H5.S1.M4", "A_WEB"): ("swipeWasIntercepted",),
    **{("H5.S2.M3", role): ("returnToPreferredRangeAvailable",)
       for role in CASE_ROLES["H5.S2.M3"]},
    **{("H5.S2.M4", role): ("oneCelebrationPerClient", "chatAccessible")
       for role in CASE_ROLES["H5.S2.M4"]},
}
CASE_ROLE_ARTIFACTS = {
    ("H7.S4.M3", "A_IOS"): ("editComposerFocusedBeforeSave",),
}


def command(args: list[str], timeout: float = 4) -> dict:
    try:
        done = subprocess.run(args, text=True, capture_output=True, timeout=timeout, check=False)
        return {"available": True, "exitCode": done.returncode, "output": done.stdout.strip()[:300]}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"available": False, "reason": type(error).__name__}


def repo_state(path: pathlib.Path) -> dict:
    if not (path / ".git").exists():
        return {"present": path.exists(), "sha": None}
    sha = command(["git", "-C", str(path), "rev-parse", "HEAD"])
    branch = command(["git", "-C", str(path), "branch", "--show-current"])
    dirty = command(["git", "-C", str(path), "status", "--porcelain"])
    return {"present": True, "sha": sha.get("output") if sha.get("exitCode") == 0 else None,
            "branch": branch.get("output") if branch.get("exitCode") == 0 else None,
            "dirty": bool(dirty.get("output"))}


def safe_base(raw: str) -> str:
    parsed = urllib.parse.urlsplit(raw)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("base URL must be HTTP(S) without credentials")
    host = parsed.hostname
    if ":" in host:
        host = f"[{host}]"
    if parsed.port:
        host += f":{parsed.port}"
    return urllib.parse.urlunsplit((parsed.scheme, host, parsed.path.rstrip("/"), "", ""))


def get_json(url: str, token: str | None = None) -> dict:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"} if token else {})
    with urllib.request.urlopen(request, timeout=3) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        body = json.load(response)
    if not isinstance(body, dict):
        raise ValueError("API response is not an object")
    return body


def response_data(body: dict) -> dict:
    """Unwrap the backend ResponseInterceptor envelope without trusting HTTP 200 alone."""
    if body.get("ok") is not True or not isinstance(body.get("data"), dict):
        raise ValueError("backend success envelope missing or invalid")
    return body["data"]


def wait_for_state(read, expected: dict, timeout: float = 8, interval: float = 0.25) -> dict:
    """Poll a real observation until all expected fields match, with a bounded timeout."""
    deadline = time.monotonic() + timeout
    last = None
    while True:
        last = read()
        if all(last.get(key) == value for key, value in expected.items()):
            return last
        if time.monotonic() >= deadline:
            raise TimeoutError(f"API state did not reach expected fields {sorted(expected)}")
        time.sleep(min(interval, max(0, deadline - time.monotonic())))


def device_state() -> dict:
    adb = os.environ.get("ADB_PATH") or shutil.which("adb") or str(pathlib.Path.home() / "Library/Android/sdk/platform-tools/adb")
    android = command([adb, "devices", "-l"])
    ios = command(["xcrun", "simctl", "list", "devices", "booted"])
    serial = os.environ.get("QA_ANDROID_SERIAL", "")
    udid = os.environ.get("QA_IOS_UDID", "")
    android_ok = bool(serial and any(line.split()[:2] == [serial, "device"] for line in str(android.get("output", "")).splitlines()))
    ios_ok = bool(udid and f"({udid}) (Booted)" in str(ios.get("output", "")))
    return {"android": {"serial": serial or None, "ready": android_ok},
            "ios": {"udid": udid or None, "booted": ios_ok}}


def observe_api(base: str, required_actors: tuple[str, ...] = ("A", "B")) -> tuple[dict, list[str]]:
    issues = []
    observed = {"ready": False, "actors": {}}
    try:
        ready = response_data(get_json(base + "/health/ready"))
        deps = ready.get("dependencies")
        if (ready.get("status") != "ok" or not isinstance(deps, dict)
                or deps.get("database") != "ready" or deps.get("migrations") != "up-to-date"
                or deps.get("redis") not in ("ready", "not-configured")):
            raise ValueError("readiness dependencies are not ready")
        observed["ready"] = True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError, json.JSONDecodeError):
        issues.append("API /health/ready unavailable")
        return observed, issues
    def identity(actor):
        token = os.environ.get(f"QA_TOKEN_{actor}")
        if not token:
            raise ValueError("token missing")
        value = response_data(get_json(base + "/auth/me", token)).get("id")
        if not isinstance(value, str) or not value:
            raise ValueError("missing actor id")
        return value
    with ThreadPoolExecutor(max_workers=len(required_actors)) as pool:
        futures = {actor: pool.submit(identity, actor) for actor in required_actors}
        for actor, future in futures.items():
            try:
                observed["actors"][actor] = {"id": future.result()}
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError, json.JSONDecodeError):
                issues.append(f"actor {actor} API identity unavailable")
    actors = observed["actors"]
    seen_ids = {}
    for actor, actor_data in actors.items():
        previous_actor = seen_ids.get(actor_data["id"])
        if previous_actor:
            issues.append(f"{previous_actor} and {actor} resolve to the same API identity")
        else:
            seen_ids[actor_data["id"]] = actor
    return observed, issues


def validate_driver_evidence(proof: dict, run_id: str, case: str, role: str,
                             api_id: str, evidence_dir: pathlib.Path) -> dict:
    if not isinstance(proof, dict) or any(proof.get(k) != v for k, v in
                                           (("runId", run_id), ("case", case), ("role", role), ("apiActorId", api_id))):
        raise ValueError("driver identity/runId mismatch")
    assertions = proof.get("assertions")
    if not isinstance(assertions, dict) or assertions.get(CASE_ASSERTIONS[case]) is not True:
        raise ValueError("required case assertion missing")
    additional_assertions = CASE_ROLE_ASSERTIONS.get((case, role), ())
    if any(assertions.get(name) is not True for name in additional_assertions):
        raise ValueError("required role assertion missing")
    artifacts = proof.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise ValueError("artifact evidence missing")
    additional_artifacts = CASE_ROLE_ARTIFACTS.get((case, role), ())
    for evidence_type in additional_artifacts:
        expected_prefix = f"{case}-{role}-keyboard-"
        typed_artifacts = [item for item in artifacts if isinstance(item, dict)
                           and item.get("evidenceType") == evidence_type]
        if len(typed_artifacts) != 1:
            raise ValueError("required role artifact missing or duplicated")
        path_value = typed_artifacts[0].get("path")
        if (not isinstance(path_value, str)
                or not pathlib.Path(path_value).name.startswith(expected_prefix)
                or pathlib.Path(path_value).suffix.lower() != ".png"):
            raise ValueError("required role artifact path is invalid")
    verified = []
    for item in artifacts:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str):
            raise ValueError("invalid artifact declaration")
        path = pathlib.Path(item["path"]).resolve()
        if not path.is_relative_to(evidence_dir.resolve()) or not path.is_file() or path.stat().st_size == 0:
            raise ValueError("artifact absent or outside evidence directory")
        artifact_bytes = path.read_bytes()
        if (item.get("evidenceType") in additional_artifacts
                and not artifact_bytes.startswith(b"\x89PNG\r\n\x1a\n")):
            raise ValueError("required role artifact has no PNG signature")
        digest = hashlib.sha256(artifact_bytes).hexdigest()
        if item.get("sha256") != digest:
            raise ValueError("artifact SHA256 mismatch")
        verified.append({"path": str(path), "sha256": digest, "bytes": path.stat().st_size})
    return {"role": role, "apiActorId": api_id, "artifacts": verified,
            "assertion": CASE_ASSERTIONS[case],
            "additionalAssertions": list(additional_assertions),
            "additionalArtifacts": list(additional_artifacts)}


def h3_role_identity_env(driver_env: dict, role: str, actors: dict) -> dict:
    """Expose the authenticated actor and opposite pair member to each H3 role."""
    actor = CASE_ROLE_ACTORS[role]
    peer = "B" if actor == "A" else "A"
    driver_env["QA_H3_ACTOR_USER_ID"] = actors[actor]["id"]
    driver_env["QA_H3_PEER_USER_ID"] = actors[peer]["id"]
    return driver_env


def run_case(case: str, run_id: str, drivers_dir: pathlib.Path,
             evidence_dir: pathlib.Path, api: dict, api_base: str | None = None,
             web_base: str | None = None) -> dict:
    actors = api.get("actors", {})
    required_actors = {"A", "B"} | {CASE_ROLE_ACTORS[role] for role in CASE_ROLES[case]}
    if not all(actor in actors for actor in required_actors):
        return {"id": case, "verdict": "BLOCKED", "reasons": ["required API identities missing"]}
    actor_ids = [actors[actor]["id"] for actor in required_actors]
    if len(actor_ids) != len(set(actor_ids)):
        return {"id": case, "verdict": "BLOCKED", "reasons": ["required API identities are not distinct"]}
    before = None
    if case == "H1.S3.M4":
        if not api_base or not os.environ.get("QA_TOKEN_A"):
            return {"id": case, "verdict": "BLOCKED", "reasons": ["authenticated API persistence probe unavailable"]}
        try:
            before = response_data(get_json(api_base + "/users/me", os.environ["QA_TOKEN_A"]))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError, json.JSONDecodeError):
            return {"id": case, "verdict": "BLOCKED", "reasons": ["initial API state unavailable"]}
    verified = []
    proofs = {}
    roles = CASE_ROLES[case]
    for role in roles:
        driver = drivers_dir / f"{case}-{role}.py"
        if not driver.is_file():
            return {"id": case, "verdict": "BLOCKED", "reasons": [f"driver {driver.name} missing"]}
    barrier_dir = None
    if case_uses_barrier(case):
        try:
            role_actors = {role: actors[CASE_ROLE_ACTORS[role]]["id"] for role in roles}
            barrier_dir = create_barrier_dir(evidence_dir, run_id, case, roles, role_actors)
        except (OSError, ValueError) as error:
            return {"id": case, "verdict": "FAIL",
                    "reasons": [f"case barrier could not be created: {type(error).__name__}"]}
    def execute(role):
        driver = drivers_dir / f"{case}-{role}.py"
        actor = CASE_ROLE_ACTORS[role]
        driver_env = os.environ.copy()
        for token_actor in ("A", "B", "C"):
            if token_actor != actor:
                driver_env.pop(f"QA_TOKEN_{token_actor}", None)
        if api_base:
            driver_env["QA_API_BASE_URL"] = api_base
        if web_base:
            driver_env["QA_WEB_BASE_URL"] = web_base
        if case.startswith("H3.S2."):
            h3_role_identity_env(driver_env, role, actors)
        if case == "H7.S4.M1" and role == "A_ANDROID":
            driver_env["QA_EXPECTED_PEER_ACTOR_ID"] = actors["B"]["id"]
        elif case == "H7.S4.M2":
            driver_env["QA_EXPECTED_PEER_ACTOR_ID"] = actors["B" if actor == "A" else "A"]["id"]
        started = time.time()
        driver_args = [sys.executable, str(driver), "--case", case, "--role", role,
                       "--run-id", run_id, "--evidence-dir", str(evidence_dir)]
        if barrier_dir:
            driver_args.extend(["--barrier-dir", str(barrier_dir)])
        done = subprocess.run(driver_args,
                              capture_output=True, text=True,
                              timeout=DRIVER_TIMEOUT_SECONDS, check=False,
                              env=driver_env)
        return done, started, time.time()
    # Each driver starts in its own process while both authenticated sessions
    # are already observable. API identity is rechecked after all drivers finish.
    with ThreadPoolExecutor(max_workers=len(roles)) as pool:
        futures = {role: pool.submit(execute, role) for role in roles}
        results = {}
        for role, future in futures.items():
            try:
                results[role] = future.result()
            except (OSError, subprocess.TimeoutExpired) as error:
                return {"id": case, "verdict": "FAIL", "reasons": [f"driver {role} execution failed: {type(error).__name__}"]}
    for role in roles:
        actor = CASE_ROLE_ACTORS[role]
        api_id = actors[actor]["id"]
        try:
            done = results[role][0]
            if done.returncode == 2:
                return {"id": case, "verdict": "BLOCKED",
                        "reasons": [f"driver {role} reported an unmet precondition"]}
            if done.returncode != 0:
                return {"id": case, "verdict": "FAIL", "reasons": [f"driver {role} exited {done.returncode}"]}
            proof = json.loads(done.stdout)
            proofs[role] = proof
            role_evidence = validate_driver_evidence(proof, run_id, case, role, api_id, evidence_dir)
            if case == "H7.S4.M2":
                role_evidence["audioEvidence"] = proof.get("audioEvidence")
                role_evidence["cleanupEvidence"] = proof.get("cleanupEvidence")
            verified.append(role_evidence)
        except (OSError, subprocess.TimeoutExpired, ValueError, json.JSONDecodeError) as error:
            return {"id": case, "verdict": "FAIL", "reasons": [f"driver {role} evidence invalid: {type(error).__name__}"]}
    if case == "H10.S3.M3":
        try:
            validate_calendar_pair(proofs, roles)
        except ValueError as error:
            return {"id": case, "verdict": "FAIL", "reasons": [str(error)]}
    if case == "H1.S3.M3":
        paths = [item["path"].lower() for result in verified for item in result["artifacts"]]
        if not any(path.endswith((".mp4", ".mov", ".webm")) for path in paths):
            return {"id": case, "verdict": "FAIL", "reasons": ["recording artifact missing"]}
        artifacts_a = verified[0]["artifacts"]
        artifacts_b = verified[1]["artifacts"]
        if ({item["path"] for item in artifacts_a} & {item["path"] for item in artifacts_b}
                or {item["sha256"] for item in artifacts_a} & {item["sha256"] for item in artifacts_b}):
            return {"id": case, "verdict": "FAIL", "reasons": ["A/B evidence artifacts are shared"]}
        overlap_start = max(results[role][1] for role in ("A", "B"))
        overlap_end = min(results[role][2] for role in ("A", "B"))
        if overlap_end <= overlap_start:
            return {"id": case, "verdict": "FAIL", "reasons": ["driver execution windows do not overlap"]}
        rendezvous = []
        for role in ("A", "B"):
            raw = proofs[role].get("rendezvousAt")
            try:
                stamp = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
                if stamp.tzinfo is None:
                    raise ValueError("timezone missing")
                observed_at = stamp.timestamp()
            except (AttributeError, TypeError, ValueError):
                return {"id": case, "verdict": "FAIL", "reasons": [f"driver {role} rendezvous missing or invalid"]}
            if not overlap_start <= observed_at <= overlap_end:
                return {"id": case, "verdict": "FAIL", "reasons": [f"driver {role} rendezvous outside overlap"]}
            rendezvous.append(observed_at)
        if abs(rendezvous[0] - rendezvous[1]) > 2:
            return {"id": case, "verdict": "FAIL", "reasons": ["A/B rendezvous timestamps too far apart"]}
        for index, role in enumerate(("A", "B")):
            verified[index]["rendezvousAt"] = proofs[role]["rendezvousAt"]
    if case == "H1.S3.M4":
        state = proofs["A"].get("apiState")
        if not isinstance(state, dict) or state.get("field") not in ("genero", "pesoIncrementoKg", "sedeId"):
            return {"id": case, "verdict": "FAIL", "reasons": ["allowed API state assertion missing"]}
        field = state["field"]
        if "value" not in state or state["value"] is None or field not in before or before[field] is None:
            return {"id": case, "verdict": "FAIL", "reasons": ["API state field or value absent"]}
        expected = state["value"]
        if before.get(field) == expected:
            return {"id": case, "verdict": "FAIL", "reasons": ["API state did not change"]}
        try:
            def read_persisted():
                actual = response_data(get_json(api_base + "/users/me", os.environ["QA_TOKEN_A"]))
                if field not in actual or actual[field] is None:
                    raise ValueError("persisted field absent")
                return actual
            wait_for_state(read_persisted,
                           {field: expected}, timeout=8)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError, json.JSONDecodeError):
            return {"id": case, "verdict": "FAIL", "reasons": ["persisted API state not observed"]}
    if case == "H7.S4.M2":
        try:
            validate_m2_audio_evidence(proofs, os.environ.get("QA_M2_DISPOSABLE_CONVERSATION_ID"))
            validate_m2_cleanup_evidence(proofs, proofs)
        except ValueError as error:
            return {"id": case, "verdict": "FAIL", "reasons": [str(error)]}
    return {"id": case, "verdict": "PASS", "evidence": verified}


def missing_drivers(case: str, drivers_dir: pathlib.Path) -> list[str]:
    """Return the declared role drivers absent for a case."""
    return [f"{case}-{role}.py" for role in CASE_ROLES[case]
            if not (drivers_dir / f"{case}-{role}.py").is_file()]


def validate_calendar_pair(proofs: dict, roles: tuple[str, ...]) -> None:
    """Require both clients to prove the same actor and server-issued event UID."""
    actor_ids = {proofs[role].get("apiActorId") for role in roles}
    uids = []
    for role in roles:
        observations = proofs[role].get("observations")
        uids.append(observations.get("uid") if isinstance(observations, dict) else None)
    if len(actor_ids) != 1 or None in actor_ids:
        raise ValueError("calendar roles did not use the same account")
    if any(not isinstance(uid, str) or not uid for uid in uids) or len(set(uids)) != 1:
        raise ValueError("calendar UID differs across clients")
    invitation_ids = [proofs[role]["observations"].get("invitationId")
                      if isinstance(proofs[role].get("observations"), dict) else None
                      for role in roles]
    if any(not isinstance(item, str) or not item for item in invitation_ids) or len(set(invitation_ids)) != 1:
        raise ValueError("calendar roles did not export the same invitation")


def case_uses_barrier(case: str) -> bool:
    """Cases with a simultaneous cross-client rendezvous share a private barrier."""
    return (case == "H5.S2.M4"
            or case == "H9.S2.M3"
            or case in ("H9.S3.M4", "H9.S3.M5", "H9.S3.M6")
            or (case.startswith(("H7.S4.", "H8.")) and len(CASE_ROLES[case]) > 1))


def case_device_issues(case: str, devices: dict) -> list[str]:
    """Check only the native devices required by this case; web is driver-gated."""
    required = {CASE_ROLE_DEVICES[role] for role in CASE_ROLES[case]
                if CASE_ROLE_DEVICES[role] in ("android", "ios")}
    issues = []
    for device in sorted(required):
        key = "ready" if device == "android" else "booted"
        label = "connected" if device == "android" else "booted"
        if not devices[device][key]:
            issues.append(f"selected {device} device is not {label}")
    return issues


def m4_fixture_issues() -> list[str]:
    if os.environ.get("QA_M4_DISPOSABLE_ACCOUNT_ACK") != "H7.S4.M4":
        return ["M4 requires QA_M4_DISPOSABLE_ACCOUNT_ACK=H7.S4.M4"]
    reserved_id = os.environ.get("QA_DISPOSABLE_CONVERSATION_ID", "")
    if not reserved_id:
        return ["M4 requires QA_DISPOSABLE_CONVERSATION_ID"]
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                        reserved_id, re.IGNORECASE):
        return ["M4 disposable conversation ID is invalid"]
    return []


def m1_fixture_issues() -> list[str]:
    """Require a dedicated Android device and disposable A/B fixture for M1."""
    if os.environ.get("QA_M1_DISPOSABLE_DEVICE_ACK") != "H7.S4.M1":
        return ["M1 requires QA_M1_DISPOSABLE_DEVICE_ACK=H7.S4.M1"]
    if os.environ.get("QA_M1_DISPOSABLE_PAIR_ACK") != "H7.S4.M1":
        return ["M1 requires QA_M1_DISPOSABLE_PAIR_ACK=H7.S4.M1"]
    reserved_id = os.environ.get("QA_M1_DISPOSABLE_CONVERSATION_ID", "")
    if not reserved_id:
        return ["M1 requires QA_M1_DISPOSABLE_CONVERSATION_ID"]
    if not re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
            reserved_id, re.IGNORECASE):
        return ["M1 disposable conversation ID is invalid"]
    return []


def m2_fixture_issues() -> list[str]:
    """Require a disposable audio pair/device and exact reserved conversation."""
    if os.environ.get("QA_M2_DISPOSABLE_PAIR_ACK") != "H7.S4.M2":
        return ["M2 requires QA_M2_DISPOSABLE_PAIR_ACK=H7.S4.M2"]
    if os.environ.get("QA_M2_DISPOSABLE_DEVICE_ACK") != "H7.S4.M2":
        return ["M2 requires QA_M2_DISPOSABLE_DEVICE_ACK=H7.S4.M2"]
    reserved_id = os.environ.get("QA_M2_DISPOSABLE_CONVERSATION_ID", "")
    if not reserved_id:
        return ["M2 requires QA_M2_DISPOSABLE_CONVERSATION_ID"]
    if not re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
            reserved_id, re.IGNORECASE):
        return ["M2 disposable conversation ID is invalid"]
    return []


def validate_m2_audio_evidence(proofs: dict, reserved_conversation_id: str | None = None) -> bool:
    roles = ("A_ANDROID", "B_IOS", "B_WEB")
    uuid = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        re.IGNORECASE)
    evidence = {}
    for role in roles:
        item = proofs.get(role, {}).get("audioEvidence")
        if not isinstance(item, dict):
            raise ValueError(f"{role} audio evidence missing")
        if not uuid.fullmatch(str(item.get("conversationId", ""))) \
                or not uuid.fullmatch(str(item.get("messageId", ""))):
            raise ValueError(f"{role} audio identity invalid")
        digest = item.get("mediaSha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"{role} audio content hash invalid")
        duration = item.get("mediaDurationMs")
        if not isinstance(duration, int) or isinstance(duration, bool) or not 1_000 <= duration <= 120_000:
            raise ValueError(f"{role} audio media duration invalid")
        expected_seconds = duration // 1_000
        if role == "A_ANDROID":
            observed = item.get("recordedDurationSeconds")
            if observed != expected_seconds:
                raise ValueError("recording and media duration do not match")
        else:
            observed = item.get("playerDurationSeconds")
            if observed != expected_seconds or item.get("playbackAdvanced") is not True:
                raise ValueError(f"{role} player duration or playback evidence invalid")
        evidence[role] = item
    baseline = evidence[roles[0]]
    if (reserved_conversation_id is not None
            and baseline["conversationId"].lower() != reserved_conversation_id.lower()):
        raise ValueError("audio evidence does not match the reserved disposable conversation")
    for role in roles[1:]:
        item = evidence[role]
        if (item["conversationId"] != baseline["conversationId"]
                or item["messageId"] != baseline["messageId"]
                or item["mediaSha256"] != baseline["mediaSha256"]):
            raise ValueError("roles did not observe the same audio content")
        if item["mediaDurationMs"] != baseline["mediaDurationMs"]:
            raise ValueError("roles observed different audio media durations")
    return True


def validate_m2_cleanup_evidence(proofs: dict, audio_proofs: dict | None = None) -> bool:
    """Require each role to observe the exact logical tombstone and media 404."""
    roles = ("A_ANDROID", "B_IOS", "B_WEB")
    message_ids = set()
    for role in roles:
        item = proofs.get(role, {}).get("cleanupEvidence")
        if (not isinstance(item, dict)
                or not isinstance(item.get("messageId"), str)
                or not re.fullmatch(
                    r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                    item["messageId"], re.IGNORECASE)
                or item.get("tombstoneConfirmed") is not True
                or item.get("mediaEndpointUnavailable") is not True
                or item.get("physicalBlobDeletion") != "not_verified"):
            raise ValueError(f"{role} did not confirm logical cleanup and media access revocation")
        message_ids.add(item["messageId"].lower())
    if len(message_ids) != 1:
        raise ValueError("roles observed different cleanup message IDs")
    if audio_proofs is not None:
        audio_ids = {audio_proofs.get(role, {}).get("audioEvidence", {}).get("messageId", "").lower()
                     for role in roles}
        if len(audio_ids) != 1 or message_ids != audio_ids:
            raise ValueError("cleanup evidence does not match the verified audio message")
    return True


def m5_fixture_issues() -> list[str]:
    """Require a separately reserved pair before the irreversible M5 revoke."""
    if os.environ.get("QA_M5_DISPOSABLE_PAIR_ACK") != "H7.S4.M5":
        return ["M5 requires QA_M5_DISPOSABLE_PAIR_ACK=H7.S4.M5"]
    for name, label in (("QA_M5_DISPOSABLE_CONVERSATION_ID", "conversation"),
                        ("QA_M5_DISPOSABLE_CONNECTION_ID", "connection")):
        value = os.environ.get(name, "")
        if not value:
            return [f"M5 requires {name}"]
        if not re.fullmatch(
                r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                value, re.IGNORECASE):
            return [f"M5 disposable {label} ID is invalid"]
    return []


def case_preflight_issues(case: str, api_issues: list[str], devices: dict) -> list[str]:
    """Combine API readiness with the native devices required by this case."""
    issues = list(api_issues)
    if case.startswith(("H4.", "H5.", "H7.S4.", "H8.", "H9.S3.", "H10.S3.", "H11.S3.")):
        issues.extend(case_device_issues(case, devices))
    if case.startswith("H7.S4."):
        if case == "H7.S4.M1":
            issues.extend(m1_fixture_issues())
        elif case == "H7.S4.M2":
            issues.extend(m2_fixture_issues())
        elif case == "H7.S4.M4":
            issues.extend(m4_fixture_issues())
        elif case == "H7.S4.M5":
            issues.extend(m5_fixture_issues())
    elif case == "H10.S3.M3":
        invitation_id = os.environ.get("QA_H10_DISPOSABLE_INVITATION_ID", "")
        if not invitation_id:
            issues.append("H10.S3.M3 requires QA_H10_DISPOSABLE_INVITATION_ID")
        elif not re.fullmatch(
                r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                invitation_id, re.IGNORECASE):
            issues.append("H10.S3.M3 disposable invitation ID is invalid")
    elif case.startswith("H1."):
        if not devices["android"]["ready"]:
            issues.append("selected Android device is not connected")
        if not devices["ios"]["booted"]:
            issues.append("selected iOS simulator is not booted")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--phase", choices=["H1", "H3", "H4", "H5", "H7", "H8", "H9", "H10", "H11"])
    group.add_argument("--case")
    parser.add_argument("--output", type=pathlib.Path)
    parser.add_argument("--drivers-dir", type=pathlib.Path, default=ROOT / "scripts/qa/drivers")
    args = parser.parse_args()
    if args.case and args.case not in CASES:
        print(f"FAIL: unregistered case {args.case}", file=sys.stderr)
        return 1
    selected = ([case for case in CASES if case.startswith(f"{args.phase}.")]
                if args.phase else [args.case])
    run_id = os.environ.get("QA_RUN_ID") or str(uuid.uuid4())
    if not isinstance(run_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run_id):
        print("FAIL: QA_RUN_ID must contain only letters, digits, - or _", file=sys.stderr)
        return 1
    try:
        api_base = safe_base(os.environ.get("QA_API_BASE_URL", "http://127.0.0.1:3011/api/v1"))
        web_base = safe_base(os.environ.get("QA_WEB_BASE_URL", "http://127.0.0.1:3002"))
    except ValueError as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    devices = device_state()
    required_actors = tuple(sorted({"A", "B"} | {
        CASE_ROLE_ACTORS[role] for case in selected for role in CASE_ROLES[case]
    }))
    api, common_issues = observe_api(api_base, required_actors)
    output = args.output or ROOT / "scripts/qa/evidence/runs" / run_id / "manifest.json"
    evidence_dir = output.parent
    evidence_dir.mkdir(parents=True, exist_ok=True)
    cases = []
    for case in selected:
        if case.startswith(("H3.S2.", "H4.", "H5.", "H7.S4.", "H8.", "H9.", "H10.", "H11.S3.")):
            absent = missing_drivers(case, args.drivers_dir)
            if absent:
                cases.append({"id": case, "verdict": "BLOCKED",
                              "requiredRoles": list(CASE_ROLES[case]),
                              "reasons": [f"required driver {name} missing" for name in absent]})
                continue
        preflight_issues = case_preflight_issues(case, common_issues, devices)
        if preflight_issues:
            blocked = {"id": case, "verdict": "BLOCKED", "reasons": preflight_issues}
            if case.startswith(("H4.", "H8.", "H9.", "H10.", "H11.S3.")):
                blocked["requiredRoles"] = list(CASE_ROLES[case])
            cases.append(blocked)
            continue
        result = run_case(case, run_id, args.drivers_dir, evidence_dir, api, api_base, web_base)
        if case.startswith(("H4.", "H8.", "H9.", "H10.", "H11.S3.")):
            result.setdefault("requiredRoles", list(CASE_ROLES[case]))
        if result["verdict"] == "PASS":
            after, after_issues = observe_api(api_base, required_actors)
            if after_issues or after.get("actors") != api.get("actors"):
                result = {"id": case, "verdict": "FAIL",
                          "reasons": ["required API identities changed after driver"]}
        cases.append(result)
    manifest = {"schemaVersion": 1, "runId": run_id,
                "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
                "repositories": {name: repo_state(path) for name, path in REPOS.items()},
                "versions": {"python": platform.python_version(), "node": command(["node", "--version"]).get("output"),
                             "yarn": command(["yarn", "--version"]).get("output")},
                "ports": {"api": urllib.parse.urlsplit(api_base).port, "web": urllib.parse.urlsplit(web_base).port},
                "api": api, "devices": devices, "cases": cases, "secretsIncluded": False}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    verdict = "FAIL" if any(item["verdict"] == "FAIL" for item in cases) else (
        "BLOCKED" if any(item["verdict"] == "BLOCKED" for item in cases) else "PASS")
    print(f"{verdict} runId={run_id} manifest={output} cases={len(cases)}")
    return {"PASS": 0, "FAIL": 1, "BLOCKED": 2}[verdict]


if __name__ == "__main__":
    sys.exit(main())
