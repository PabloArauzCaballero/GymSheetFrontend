#!/usr/bin/env python3
"""Maestro role driver for the H10 calendar export scenario on iOS."""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[3]
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def api_json(api_base: str, token: str, endpoint: str):
    request = urllib.request.Request(
        api_base.rstrip("/") + endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            envelope = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"authenticated API request unavailable ({type(error).__name__})") from error
    if not isinstance(envelope, dict) or envelope.get("ok") is not True or "data" not in envelope:
        raise RuntimeError("API success envelope missing or invalid")
    return envelope["data"]


def calendar_uid(api_base: str, token: str, invitation_id: str) -> str:
    endpoint = f"/me/training-invitations/{urllib.parse.quote(invitation_id, safe='')}/calendar.ics"
    request = urllib.request.Request(api_base.rstrip("/") + endpoint,
                                     headers={"Authorization": f"Bearer {token}", "Accept": "text/calendar"})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            content_type = response.headers.get("Content-Type", "").lower()
            ics = response.read(128 * 1024 + 1).decode("utf-8")
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError) as error:
        raise RuntimeError(f"calendar export unavailable ({type(error).__name__})") from error
    if "text/calendar" not in content_type or len(ics) > 128 * 1024:
        raise RuntimeError("API did not return a bounded calendar file")
    unfolded = re.sub(r"\r\n[ \t]", "", ics)
    matches = re.findall(r"(?:^|\r\n)UID:([^\r\n]+)", unfolded)
    if not ics.startswith("BEGIN:VCALENDAR\r\n") or not ics.endswith("END:VCALENDAR\r\n") or len(matches) != 1 or not matches[0].strip():
        raise RuntimeError("API returned invalid calendar content")
    return matches[0]


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def flow(invitation_id: str) -> str:
    return "\n".join((
        "appId: app.gymsheet.mobile",
        "---",
        f"- openLink: {yaml_quote('gymsheet://training-invitations')}",
        f"- tapOn:\n    id: {yaml_quote(f'training-invitation-calendar-{invitation_id}')}",
    )) + "\n"


def run(args: list[str]) -> int:
    options = {}
    index = 0
    while index < len(args):
        if not args[index].startswith("--") or index + 1 >= len(args):
            raise ValueError("invalid driver arguments")
        options[args[index][2:]] = args[index + 1]
        index += 2
    for key in ("case", "role", "run-id", "evidence-dir"):
        if not options.get(key):
            raise ValueError(f"missing {key}")
    if options["case"] != "H10.S3.M3" or options["role"] != "A_IOS":
        raise ValueError("unsupported case or role")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", options["run-id"]):
        raise ValueError("invalid run ID")
    token, api_base, invitation_id, udid = (os.environ.get(name) for name in (
        "QA_TOKEN_A", "QA_API_BASE_URL", "QA_H10_DISPOSABLE_INVITATION_ID", "QA_IOS_UDID"))
    if not token or not api_base or not invitation_id or not udid:
        print("BLOCKED: H10.S3.M3 requires QA A credentials, API base, disposable invitation ID, and iOS simulator UDID", file=sys.stderr)
        return 2
    if not UUID.fullmatch(invitation_id):
        raise ValueError("QA_H10_DISPOSABLE_INVITATION_ID must be a UUID")
    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        print("BLOCKED: Maestro CLI is unavailable", file=sys.stderr)
        return 2
    simctl = shutil.which("xcrun")
    if not simctl:
        print("BLOCKED: Xcode simctl is unavailable", file=sys.stderr)
        return 2
    state = subprocess.run([simctl, "simctl", "list", "devices", "booted"], capture_output=True,
                           text=True, timeout=5, check=False)
    if state.returncode or f"({udid}) (Booted)" not in state.stdout:
        print("BLOCKED: assigned iOS simulator is not booted", file=sys.stderr)
        return 2

    identity = api_json(api_base, token, "/auth/me")
    invitations = api_json(api_base, token, "/me/training-invitations")
    invitation = next((item for item in invitations if isinstance(item, dict) and item.get("id") == invitation_id), None) if isinstance(invitations, list) else None
    if not identity or not isinstance(identity.get("id"), str) or not invitation or not invitation.get("meeting"):
        raise ValueError("QA invitation must belong to actor A and have a materialized meeting")
    first_uid = calendar_uid(api_base, token, invitation_id)
    evidence = pathlib.Path(options["evidence-dir"]).resolve(strict=True)
    screenshot = evidence / f"H10.S3.M3-A_IOS-{options['run-id']}.png"
    success = False
    try:
        with tempfile.TemporaryDirectory(prefix="gymsheet-h10-ios-") as temp:
            private_dir = pathlib.Path(temp)
            private_dir.chmod(0o700)
            flow_path = private_dir / "calendar-export.yaml"
            flow_path.write_text(flow(invitation_id), encoding="utf-8")
            flow_path.chmod(0o600)
            result = subprocess.run([maestro, "test", "--udid", udid, str(flow_path)],
                                    capture_output=True, text=True, timeout=110, check=False)
            if result.returncode != 0:
                raise RuntimeError(f"Maestro calendar share flow failed ({result.returncode})")
        second_uid = calendar_uid(api_base, token, invitation_id)
        if first_uid != second_uid:
            raise RuntimeError("calendar UID changed across repeated authenticated exports")
        captured = subprocess.run([simctl, "simctl", "io", udid, "screenshot", str(screenshot)],
                                  capture_output=True, text=True, timeout=10, check=False)
        if captured.returncode or not screenshot.is_file() or screenshot.stat().st_size == 0:
            raise RuntimeError("iOS calendar share screenshot capture failed")
        screenshot.chmod(0o600)
        if not screenshot.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("iOS screenshot is not a PNG")
        success = True
        print(json.dumps({
            "runId": options["run-id"], "case": options["case"], "role": options["role"],
            "apiActorId": identity["id"], "assertions": {"calendarExportRetainsStableUid": True},
            "observations": {"uid": first_uid, "invitationId": invitation_id, "calendarShareButtonTapped": True},
            "artifacts": [{"path": str(screenshot), "sha256": hashlib.sha256(screenshot.read_bytes()).hexdigest()}],
        }))
        return 0
    finally:
        if not success:
            screenshot.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        sys.exit(run(sys.argv[1:]))
    except (OSError, RuntimeError, TimeoutError, ValueError, subprocess.SubprocessError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
