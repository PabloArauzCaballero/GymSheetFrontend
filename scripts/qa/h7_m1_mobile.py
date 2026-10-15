"""Android Maestro role for H7.S4.M1 microphone denial and text availability."""
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
import time
import uuid

ROLE_DEADLINE_SECONDS = 150
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h7_m5_mobile import PairPreconditionError, api_data

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
PACKAGE = "app.gymsheet.mobile"
MICROPHONE_PERMISSION = "android.permission.RECORD_AUDIO"


def require_m1_fixture(device_ack: str | None, pair_ack: str | None,
                       conversation_id: str | None) -> str:
    if device_ack != "H7.S4.M1":
        raise PairPreconditionError("M1 requires an explicit dedicated Android device acknowledgement")
    if pair_ack != "H7.S4.M1":
        raise PairPreconditionError("M1 requires an explicit disposable A/B pair acknowledgement")
    if not isinstance(conversation_id, str) or not UUID.fullmatch(conversation_id):
        raise PairPreconditionError("M1 requires a valid reserved disposable conversation UUID")
    return conversation_id


def find_reserved_conversation(conversations: list, reserved_id: str,
                              expected_peer_id: str) -> str:
    if not isinstance(conversations, list):
        raise ValueError("conversation list is invalid")
    matches = [row for row in conversations if row.get("conversationId") == reserved_id]
    if len(matches) != 1 or matches[0].get("systemKind") is not None:
        raise PairPreconditionError("reserved direct conversation is missing or ambiguous")
    if matches[0].get("canWrite") is not True:
        raise PairPreconditionError("reserved conversation is not writable")
    if matches[0].get("otherUserId") != expected_peer_id:
        raise PairPreconditionError("reserved conversation does not belong to the assigned peer")
    return reserved_id


def microphone_permission_commands(adb: str, device_id: str) -> list[list[str]]:
    prefix = [adb, "-s", device_id, "shell", "pm"]
    return [
        [*prefix, "revoke", PACKAGE, MICROPHONE_PERMISSION],
        [*prefix, "set-permission-flags", PACKAGE, MICROPHONE_PERMISSION, "user-set", "user-fixed"],
        [*prefix, "check-permission", PACKAGE, MICROPHONE_PERMISSION],
        [adb, "-s", device_id, "shell", "dumpsys", "package", PACKAGE],
    ]


def is_permanently_denied(permission_result: str, package_dump: str) -> bool:
    match = re.search(
        rf"{re.escape(MICROPHONE_PERMISSION)}:\s*granted=false,\s*flags=\[([^\]]*)\]",
        package_dump, re.IGNORECASE)
    flags = set(re.split(r"[|,\s]+", match.group(1).upper())) if match else set()
    return permission_result.strip().lower() == "denied" and "USER_FIXED" in flags


def apply_permanent_microphone_denial(adb: str, device_id: str) -> None:
    commands = microphone_permission_commands(adb, device_id)
    for command in commands[:2]:
        result = subprocess.run(command, capture_output=True, text=True,
                                timeout=10, check=False)
        if result.returncode != 0:
            raise RuntimeError("could not set microphone permission to permanently denied")
    permission = subprocess.run(commands[2], capture_output=True, text=True,
                                timeout=10, check=False)
    package_dump = subprocess.run(commands[3], capture_output=True, text=True,
                                  timeout=10, check=False)
    if (permission.returncode != 0 or permission.stdout.strip().lower() != "denied"
            or package_dump.returncode != 0
            or not is_permanently_denied(permission.stdout, package_dump.stdout)):
        raise RuntimeError("Android did not confirm permanent microphone denial")


def build_identity_preflight_flow(email: str) -> str:
    if not email:
        raise ValueError("M1 API identity email is required")
    return "\n".join([
        "appId: app.gymsheet.mobile", "---",
        f"- openLink: {json.dumps('gymsheet://profile', ensure_ascii=False)}",
        f"- assertVisible: {json.dumps(email, ensure_ascii=False)}", "",
    ])


def build_permission_flow(conversation_id: str, draft: str) -> str:
    if not UUID.fullmatch(conversation_id) or not draft:
        raise ValueError("invalid M1 conversation or draft")
    lines = [
        "appId: app.gymsheet.mobile", "---",
        f"- openLink: {json.dumps(f'gymsheet://chat/{conversation_id}', ensure_ascii=False)}",
        "- tapOn: Grabar mensaje de voz",
        "- assertVisible: Permite el micrófono en Ajustes",
        "- assertVisible: Para grabar mensajes de voz, activa el micrófono para GymSheet en los ajustes del dispositivo. Puedes seguir escribiendo mensajes mientras tanto.",
        "- takeScreenshot: microphone-denied-alert",
        "- tapOn: Ahora no",
        "- tapOn: Escribe un mensaje",
        f"- inputText: {json.dumps(draft, ensure_ascii=False)}",
        f"- assertVisible: {json.dumps(draft, ensure_ascii=False)}",
        "- assertVisible: Enviar mensaje",
        "- takeScreenshot: text-draft",
        "- eraseText: 200",
        f"- assertNotVisible: {json.dumps(draft, ensure_ascii=False)}", "",
    ]
    return "\n".join(lines)


def remaining(deadline: float) -> float:
    value = deadline - time.monotonic()
    if value <= 0:
        raise TimeoutError("M1 role deadline exceeded")
    return value


def run_maestro(maestro: str, device_id: str, flow: pathlib.Path,
                deadline: float, output_dir: pathlib.Path) -> None:
    command = [maestro, "test", "--device", device_id, "--test-output-dir",
               str(output_dir), str(flow)]
    try:
        result = subprocess.run(command, capture_output=True, text=True,
                                timeout=max(1, remaining(deadline)), check=False)
    except subprocess.TimeoutExpired as error:
        raise TimeoutError("M1 Maestro UI flow timed out") from error
    if result.returncode != 0:
        raise RuntimeError(f"M1 Maestro UI flow failed ({result.returncode})")


def copy_maestro_screenshot(output_dir: pathlib.Path, evidence: pathlib.Path,
                            run_id: str, invocation_id: str, label: str) -> dict:
    matches = list(output_dir.rglob(f"{label}.png"))
    if len(matches) != 1:
        raise RuntimeError(f"M1 Maestro {label} screenshot is missing or ambiguous")
    data = matches[0].read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"M1 Maestro {label} screenshot is not a PNG")
    path = evidence / f"H7.S4.M1-A_ANDROID-{run_id}-{invocation_id}-{label}.png"
    path.write_bytes(data)
    path.chmod(0o600)
    return {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def run(argv: list[str]) -> int:
    deadline = time.monotonic() + ROLE_DEADLINE_SECONDS
    values = {}
    index = 0
    while index < len(argv):
        if not argv[index].startswith("--") or index + 1 >= len(argv):
            raise ValueError("invalid M1 driver arguments")
        values[argv[index][2:]] = argv[index + 1]
        index += 2
    if any(not values.get(key) for key in ("case", "role", "run-id", "evidence-dir")):
        raise ValueError("required M1 driver argument missing")
    if values["case"] != "H7.S4.M1" or values["role"] != "A_ANDROID":
        raise ValueError("M1 mobile driver invoked for the wrong case or role")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", values["run-id"]):
        raise ValueError("invalid M1 run ID")
    reserved_id = os.environ.get("QA_M1_DISPOSABLE_CONVERSATION_ID")
    conversation_id = require_m1_fixture(
        os.environ.get("QA_M1_DISPOSABLE_DEVICE_ACK"),
        os.environ.get("QA_M1_DISPOSABLE_PAIR_ACK"), reserved_id)
    token, api_base = os.environ.get("QA_TOKEN_A"), os.environ.get("QA_API_BASE_URL")
    if not token or not api_base:
        raise PairPreconditionError("A token or API base URL is unavailable")
    device_id = os.environ.get("QA_ANDROID_SERIAL")
    adb = os.environ.get("ADB_PATH") or shutil.which("adb")
    if not device_id or not adb:
        raise PairPreconditionError("Android serial or adb is unavailable")
    state = subprocess.run([adb, "-s", device_id, "get-state"], capture_output=True,
                           text=True, timeout=5, check=False)
    if state.returncode != 0 or state.stdout.strip() != "device":
        raise PairPreconditionError("assigned Android device is not connected")
    installed = subprocess.run([adb, "-s", device_id, "shell", "pm", "path", PACKAGE],
                               capture_output=True, text=True, timeout=5, check=False)
    if installed.returncode != 0 or not installed.stdout.strip().startswith("package:"):
        raise PairPreconditionError("GymSheet is not installed on the assigned Android device")
    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        candidate = pathlib.Path.home() / ".maestro/bin/maestro"
        maestro = str(candidate) if candidate.is_file() else None
    if not maestro:
        raise PairPreconditionError("Maestro CLI is unavailable")

    identity = api_data(api_base, token, "/auth/me")
    peer_id = os.environ.get("QA_EXPECTED_PEER_ACTOR_ID")
    if not peer_id:
        raise PairPreconditionError("assigned B actor identity is unavailable")
    conversation_id = find_reserved_conversation(
        api_data(api_base, token, "/me/conversations"), conversation_id, peer_id)

    evidence = pathlib.Path(values["evidence-dir"]).resolve(strict=True)
    invocation_id = uuid.uuid4().hex
    draft = f"H7.S4.M1 {values['run-id']} {invocation_id} draft"
    identity_flow_text = build_identity_preflight_flow(identity["email"])
    permission_flow_text = build_permission_flow(conversation_id, draft)
    with tempfile.TemporaryDirectory(prefix="gymsheet-h7-m1-android-") as temporary:
        private = pathlib.Path(temporary)
        private.chmod(0o700)
        output_dir = private / "maestro-output"
        output_dir.mkdir(mode=0o700)
        identity_flow = private / "identity-preflight.yaml"
        identity_flow.write_text(identity_flow_text, encoding="utf-8")
        identity_flow.chmod(0o600)
        permission_flow = private / "microphone-denied.yaml"
        permission_flow.write_text(permission_flow_text, encoding="utf-8")
        permission_flow.chmod(0o600)
        run_maestro(maestro, device_id, identity_flow, deadline, output_dir)
        # This intentionally leaves RECORD_AUDIO denied with user-fixed on the
        # acknowledged disposable device to exercise the permanent-denial path.
        apply_permanent_microphone_denial(adb, device_id)
        run_maestro(maestro, device_id, permission_flow, deadline, output_dir)
        artifacts = [copy_maestro_screenshot(output_dir, evidence, values["run-id"],
                                             invocation_id, label)
                     for label in ("microphone-denied-alert", "text-draft")]
    print(json.dumps({"runId": values["run-id"], "case": values["case"],
        "role": "A_ANDROID", "apiActorId": identity["id"],
        "assertions": {"microphoneDeniedTextAvailable": True}, "artifacts": artifacts}))
    return 0


def main() -> int:
    try:
        return run(sys.argv[1:])
    except PairPreconditionError as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
