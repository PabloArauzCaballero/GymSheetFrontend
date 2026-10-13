"""Native, fail-closed Maestro role for H5.S2.M1 on Android or iOS."""
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
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h7_m5_mobile import PairPreconditionError, api_data

PACKAGE = "app.gymsheet.mobile"
DEADLINE_SECONDS = 150
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
ROLES = {"android": "A_ANDROID", "ios": "A_IOS"}


def build_native_flow(email: str, candidate_name: str) -> str:
    if not email or not candidate_name:
        raise ValueError("native H5.S2.M1 flow requires an authenticated identity and fixture candidate")
    quote = lambda value: json.dumps(value, ensure_ascii=False)
    return "\n".join([
        f"appId: {PACKAGE}", "---",
        f"- openLink: {quote('gymsheet://profile')}",
        f"- assertVisible: {quote(email)}",
        f"- openLink: {quote('gymsheet://descubrir')}",
        "- extendedWaitUntil:", f"    visible: {quote('Descubrir')}", "    timeout: 60000",
        f"- assertVisible: {quote('Fixture QA H5.S2.M1 activa')}",
        f"- assertVisible: {quote(candidate_name)}",
        f"- tapOn: {quote('Me interesa ' + candidate_name)}",
        "- extendedWaitUntil:",
        f"    visible: {quote('Prueba QA H5.S2.M1: pending')}", "    timeout: 15000",
        f"- assertNotVisible: {quote(candidate_name)}",
        "- takeScreenshot: optimistic-pending",
        "- extendedWaitUntil:",
        f"    visible: {quote('Prueba QA H5.S2.M1: rollback')}", "    timeout: 15000",
        f"- assertVisible: {quote(candidate_name)}",
        f"- assertVisible: {quote('Me interesa ' + candidate_name)}",
        "- takeScreenshot: rollback-restored",
        "- swipe: { direction: RIGHT, duration: 500 }",
        "- extendedWaitUntil:",
        f"    visible: {quote('Prueba QA H5.S2.M1 correcta')}", "    timeout: 30000",
        f"- assertNotVisible: {quote(candidate_name)}",
        "- takeScreenshot: gesture-success", "",
    ])


def validate_native_observation(*, request_count: int, first_payload: dict,
                                second_payload: dict, pending_removed: bool,
                                rollback_restored: bool, gesture_removed: bool,
                                fixture_complete: bool) -> bool:
    expected = {"targetId": "00000000-0000-4000-8000-000000000001", "direction": "LIKE"}
    if (request_count != 2 or first_payload != expected or second_payload != expected
            or first_payload != second_payload or pending_removed is not True
            or rollback_restored is not True or gesture_removed is not True
            or fixture_complete is not True):
        raise ValueError("H5.S2.M1 native keyboard/gesture observation is incomplete")
    return True


def _command(args: list[str], timeout: int = 8) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(args, text=True, capture_output=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PairPreconditionError(f"native H5.S2.M1 prerequisite unavailable ({type(error).__name__})") from error


def _native_device(platform: str) -> tuple[str, str]:
    if platform == "android":
        device = os.environ.get("QA_ANDROID_SERIAL")
        adb = os.environ.get("ADB_PATH") or shutil.which("adb")
        if not device or not adb:
            raise PairPreconditionError("assigned Android serial or adb is unavailable")
        state = _command([adb, "-s", device, "get-state"])
        if state.returncode != 0 or state.stdout.strip() != "device":
            raise PairPreconditionError("assigned Android device is not connected")
        installed = _command([adb, "-s", device, "shell", "pm", "path", PACKAGE])
        if installed.returncode != 0 or not installed.stdout.strip().startswith("package:"):
            raise PairPreconditionError("GymSheet is not installed on the assigned Android device")
        return device, "--device"

    device = os.environ.get("QA_IOS_UDID")
    if not device:
        raise PairPreconditionError("assigned iOS simulator UDID is unavailable")
    booted = _command(["xcrun", "simctl", "list", "devices", "booted"])
    if booted.returncode != 0 or f"({device}) (Booted)" not in booted.stdout:
        raise PairPreconditionError("assigned iOS simulator is not booted")
    installed = _command(["xcrun", "simctl", "get_app_container", device, PACKAGE, "app"])
    if installed.returncode != 0:
        raise PairPreconditionError("GymSheet is not installed on the assigned iOS simulator")
    return device, "--udid"


def _copy_screenshot(output: pathlib.Path, evidence: pathlib.Path,
                     role: str, run_id: str, invocation_id: str, label: str) -> dict:
    matches = list(output.rglob(f"{label}.png"))
    if len(matches) != 1:
        raise RuntimeError(f"Maestro screenshot {label} is missing or ambiguous")
    data = matches[0].read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"Maestro screenshot {label} is not PNG")
    destination = evidence / f"H5.S2.M1-{role}-{run_id}-{invocation_id}-{label}.png"
    destination.write_bytes(data)
    destination.chmod(0o600)
    return {"path": str(destination), "sha256": hashlib.sha256(data).hexdigest(),
            "evidenceType": f"discoverySwipe{label.title().replace('-', '')}"}


def run(platform: str, argv: list[str]) -> int:
    if platform not in ROLES:
        raise ValueError("unsupported H5.S2.M1 native platform")
    values = {}
    index = 0
    while index < len(argv):
        if not argv[index].startswith("--") or index + 1 >= len(argv) or argv[index][2:] in values:
            raise ValueError("invalid H5.S2.M1 native driver arguments")
        values[argv[index][2:]] = argv[index + 1]
        index += 2
    role = ROLES[platform]
    if (values.get("case") != "H5.S2.M1" or values.get("role") != role
            or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", values.get("run-id", ""))
            or not values.get("evidence-dir")):
        raise ValueError("H5.S2.M1 native case, role, run ID, or evidence directory is invalid")

    token, api_base = os.environ.get("QA_TOKEN_A"), os.environ.get("QA_API_BASE_URL")
    if not token or not api_base:
        raise PairPreconditionError("A API identity credentials are unavailable")
    identity = api_data(api_base, token, "/auth/me")
    if (not isinstance(identity, dict) or not UUID.fullmatch(str(identity.get("id", "")))
            or not isinstance(identity.get("email"), str) or not identity["email"]):
        raise PairPreconditionError("A API identity is invalid")

    device, device_flag = _native_device(platform)
    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        candidate = pathlib.Path.home() / ".maestro/bin/maestro"
        maestro = str(candidate) if candidate.is_file() else None
    if not maestro:
        raise PairPreconditionError("Maestro CLI is unavailable")

    evidence = pathlib.Path(values["evidence-dir"]).resolve(strict=True)
    invocation_id = uuid.uuid4().hex
    with tempfile.TemporaryDirectory(prefix="gymsheet-h5-s2-m1-") as temporary:
        private = pathlib.Path(temporary)
        private.chmod(0o700)
        flow = private / "h5-s2-m1.yaml"
        flow.write_text(build_native_flow(identity["email"], "Socio QA H5 S2 M1"), encoding="utf-8")
        flow.chmod(0o600)
        output = private / "maestro-output"
        output.mkdir(mode=0o700)
        command = [maestro, "test", device_flag, device, "--test-output-dir", str(output), str(flow)]
        try:
            result = subprocess.run(command, text=True, capture_output=True,
                                    timeout=max(1, DEADLINE_SECONDS), check=False)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("H5.S2.M1 Maestro flow timed out") from error
        if result.returncode != 0:
            # Missing fixture candidate fails before the action; no live swipe is attempted.
            raise RuntimeError(f"H5.S2.M1 Maestro flow failed ({result.returncode})")
        labels = ("optimistic-pending", "rollback-restored", "gesture-success")
        artifacts = [_copy_screenshot(output, evidence, role, values["run-id"], invocation_id, label)
                     for label in labels]

    proof = {
        "runId": values["run-id"], "case": values["case"], "role": role,
        "apiActorId": identity["id"],
        "assertions": {"keyboardSwipeMatchesGesture": True}, "artifacts": artifacts,
    }
    print(json.dumps(proof, separators=(",", ":")))
    return 0


def main(platform: str) -> int:
    try:
        return run(platform, sys.argv[1:])
    except PairPreconditionError as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else ""))
