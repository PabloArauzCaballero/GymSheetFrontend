"""Read-only Maestro observers for the H7.S4.M4 cross-platform receipt test."""
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
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from pair_barrier import arrive_and_wait

ROLES = ("A_ANDROID", "A_IOS", "A_WEB", "B_WEB")
DEADLINE_SECONDS = 150
API_TIMEOUT_SECONDS = 8
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


class PairPreconditionError(ValueError):
    pass


def pair_actor_ids(metadata: dict, run_id: str, case: str, role: str,
                   actor_id: str) -> dict[str, str]:
    if (metadata.get("runId") != run_id or metadata.get("case") != case
            or metadata.get("expectedRoles") != sorted(ROLES)
            or not re.fullmatch(r"[0-9a-f]{32}", str(metadata.get("invocationId", "")))
            or not isinstance(metadata.get("expectedActorIds"), dict)
            or sorted(metadata["expectedActorIds"]) != sorted(ROLES)):
        raise ValueError("barrier identity metadata mismatch")
    if role not in ROLES or metadata["expectedActorIds"].get(role) != actor_id:
        raise ValueError("role actor identity mismatch")
    actor_ids = [metadata["expectedActorIds"][candidate] for candidate in ROLES]
    distinct = set(actor_ids)
    if any(not isinstance(value, str) or not value for value in actor_ids) or len(distinct) != 2:
        raise ValueError("expected exactly two distinct pair actors")
    peer_ids = distinct - {actor_id}
    if actor_id not in distinct or len(peer_ids) != 1:
        raise ValueError("role is not assigned to the A/B pair")
    return {"actorId": actor_id, "peerId": next(iter(peer_ids))}


def require_disposable_conversation(conversation_id: object,
                                    reserved_id: str | None) -> str:
    if (not isinstance(conversation_id, str) or not UUID.fullmatch(conversation_id)
            or not isinstance(reserved_id, str) or not UUID.fullmatch(reserved_id)):
        raise ValueError("M4 requires a valid reserved disposable conversation UUID")
    if conversation_id.lower() != reserved_id.lower():
        raise ValueError("assigned pair conversation does not match reserved disposable conversation")
    return conversation_id


def find_reserved_pair_conversation(conversations: object, peer_id: str,
                                    reserved_id: str) -> str:
    if not isinstance(conversations, list):
        raise ValueError("conversation list is invalid")
    matches = [item for item in conversations if isinstance(item, dict)
               and item.get("conversationId") == reserved_id
               and item.get("otherUserId") == peer_id
               and item.get("systemKind") is None
               and item.get("canWrite") is True]
    if len(matches) != 1:
        raise PairPreconditionError(
            "reserved disposable conversation was not found exactly once for the assigned peer")
    return require_disposable_conversation(matches[0]["conversationId"], reserved_id)


def assert_restorable_settings(settings: object) -> dict:
    if (not isinstance(settings, dict) or settings.get("enabled") is not True
            or settings.get("conversationOverride") is not True
            or not isinstance(settings.get("version"), int)
            or isinstance(settings.get("version"), bool) or settings["version"] < 0):
        raise PairPreconditionError("M4 requires an explicitly enabled conversation preference")
    return settings


def fixture_body(run_id: str, invocation_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run_id):
        raise ValueError("invalid M4 run ID")
    if not re.fullmatch(r"[0-9a-f]{32}", invocation_id):
        raise ValueError("invalid M4 invocation ID")
    return f"H7.S4.M4 {run_id} {invocation_id} receipt-scope"


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_observer_flow(email: str, conversation_id: str, body: str,
                        state: str) -> str:
    if not UUID.fullmatch(conversation_id):
        raise ValueError("invalid M4 conversation UUID")
    if state not in ("initial", "disabled", "restored"):
        raise ValueError("invalid M4 UI state")
    setting_label = "Activar solo en este chat" if state == "disabled" else "Desactivar solo en este chat"
    commands = [
        "appId: app.gymsheet.mobile",
        "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        f"- assertVisible: {yaml_quote(body)}",
        "- tapOn:",
        "    text: Más opciones de conversación",
        f"- assertVisible: {yaml_quote(setting_label)}",
    ]
    return "\n".join(commands) + "\n"


def build_close_menu_flow() -> str:
    return "\n".join([
        "appId: app.gymsheet.mobile",
        "---",
        "- tapOn: Cerrar",
        "- assertNotVisible: Confirmación de lectura",
        "",
    ])


def api_data(api_base: str, token: str, endpoint: str, method: str = "GET",
             body: dict | None = None) -> dict | list:
    parsed = urllib.parse.urlsplit(api_base)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("invalid API base URL")
    if not endpoint.startswith("/") or ".." in endpoint:
        raise ValueError("invalid API endpoint")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(api_base.rstrip("/") + endpoint, data=payload,
                                     headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            envelope = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 403 and method == "POST" and endpoint == "/me/conversations":
            raise PairPreconditionError("A/B actors do not have an accepted chat connection") from error
        raise RuntimeError(f"API request failed ({error.code})") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"API request unavailable ({type(error).__name__})") from error
    if not isinstance(envelope, dict) or envelope.get("ok") is not True or "data" not in envelope:
        raise RuntimeError("API success envelope missing or invalid")
    return envelope["data"]


def wait_for_receipt_state(api_base: str, token: str, conversation_id: str,
                           enabled: bool, conversation_override: bool,
                           deadline: float) -> dict:
    endpoint = "/me/chat/read-receipts?conversationId=" + urllib.parse.quote(conversation_id, safe="")
    while time.monotonic() < deadline:
        settings = api_data(api_base, token, endpoint)
        if (isinstance(settings, dict) and settings.get("enabled") is enabled
                and settings.get("conversationOverride") is conversation_override):
            return settings
        time.sleep(min(0.25, max(0.01, deadline - time.monotonic())))
    raise TimeoutError("M4 conversation receipt setting did not reach the expected state")


def remaining(deadline: float) -> float:
    value = deadline - time.monotonic()
    if value <= 0:
        raise TimeoutError("M4 mobile role deadline exceeded")
    return value


def maestro_device_flag(platform: str) -> str:
    if platform == "ios":
        return "--udid"
    if platform == "android":
        return "--device"
    raise ValueError("unsupported M4 platform")


def run_maestro(maestro: str, platform: str, device_id: str, flow: pathlib.Path,
                deadline: float, output_dir: pathlib.Path) -> None:
    command = [maestro, "test", maestro_device_flag(platform), device_id]
    command.extend(["--test-output-dir", str(output_dir), str(flow)])
    try:
        result = subprocess.run(command, capture_output=True, text=True,
                                timeout=max(1, remaining(deadline)), check=False)
    except subprocess.TimeoutExpired as error:
        raise TimeoutError("M4 Maestro UI flow timed out") from error
    if result.returncode != 0:
        raise RuntimeError(f"M4 Maestro UI flow failed ({result.returncode})")


def capture_artifact(platform: str, device_id: str, evidence: pathlib.Path,
                     run_id: str, invocation_id: str, state: str) -> dict:
    path = evidence / f"H7.S4.M4-{platform}-{run_id}-{invocation_id}-{state}.png"
    if platform == "ios":
        result = subprocess.run(["xcrun", "simctl", "io", device_id,
                                 "screenshot", str(path)], capture_output=True,
                                text=True, timeout=10, check=False)
        if result.returncode != 0:
            raise RuntimeError("iOS simulator screenshot failed")
    else:
        adb = os.environ.get("ADB_PATH") or shutil.which("adb")
        if not adb:
            raise PairPreconditionError("adb is unavailable")
        result = subprocess.run([adb, "-s", device_id, "exec-out", "screencap", "-p"],
                                capture_output=True, timeout=10, check=False)
        if result.returncode != 0 or not result.stdout.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("Android simulator screenshot failed")
        path.write_bytes(result.stdout)
    if not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError("M4 screenshot artifact is empty")
    path.chmod(0o600)
    return {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def run(role: str, platform: str, argv: list[str]) -> int:
    deadline = time.monotonic() + DEADLINE_SECONDS
    values = {}
    index = 0
    while index < len(argv):
        key = argv[index]
        if not key.startswith("--") or index + 1 >= len(argv):
            raise ValueError("invalid M4 driver arguments")
        values[key[2:]] = argv[index + 1]
        index += 2
    required = ("case", "role", "run-id", "evidence-dir", "barrier-dir")
    if any(not values.get(key) for key in required):
        raise ValueError("required M4 driver argument missing")
    run_id = values["run-id"]
    if values["case"] != "H7.S4.M4" or values["role"] != role:
        raise ValueError("M4 role driver invoked for the wrong case or role")
    token = os.environ.get("QA_TOKEN_A")
    api_base = os.environ.get("QA_API_BASE_URL")
    reserved_id = os.environ.get("QA_DISPOSABLE_CONVERSATION_ID")
    if os.environ.get("QA_M4_DISPOSABLE_ACCOUNT_ACK") != "H7.S4.M4":
        raise PairPreconditionError("explicit disposable-account acknowledgement is required")
    if not token or not api_base:
        raise PairPreconditionError("A token or API base URL is unavailable")
    if not reserved_id:
        raise PairPreconditionError("QA_DISPOSABLE_CONVERSATION_ID is required")
    if platform == "ios":
        device_id = os.environ.get("QA_IOS_UDID")
        if not device_id:
            raise PairPreconditionError("iOS simulator UDID is unavailable")
        state = subprocess.run(["xcrun", "simctl", "list", "devices", "booted"],
                               capture_output=True, text=True, timeout=5, check=False)
        if state.returncode != 0 or f"({device_id}) (Booted)" not in state.stdout:
            raise PairPreconditionError("assigned iOS simulator is not booted")
        udid = device_id
    else:
        device_id = os.environ.get("QA_ANDROID_SERIAL")
        adb = os.environ.get("ADB_PATH") or shutil.which("adb")
        if not device_id or not adb:
            raise PairPreconditionError("Android serial or adb is unavailable")
        state = subprocess.run([adb, "-s", device_id, "get-state"],
                               capture_output=True, text=True, timeout=5, check=False)
        if state.returncode != 0 or state.stdout.strip() != "device":
            raise PairPreconditionError("assigned Android device is not connected")
        udid = None

    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        candidate = pathlib.Path.home() / ".maestro/bin/maestro"
        maestro = str(candidate) if candidate.is_file() else None
    if not maestro:
        raise PairPreconditionError("Maestro CLI is unavailable")

    evidence = pathlib.Path(values["evidence-dir"]).resolve(strict=True)
    barrier = pathlib.Path(values["barrier-dir"]).resolve(strict=True)
    metadata = json.loads((barrier / ".barrier.json").read_text(encoding="utf-8"))
    identity = api_data(api_base, token, "/auth/me")
    if not isinstance(identity, dict) or not isinstance(identity.get("id"), str) or not identity.get("email"):
        raise ValueError("A API identity is incomplete")
    actors = pair_actor_ids(metadata, run_id, values["case"], role, identity["id"])
    reserved_id = require_disposable_conversation(reserved_id, reserved_id)
    conversations = api_data(api_base, token, "/me/conversations")
    conversation_id = find_reserved_pair_conversation(conversations, actors["peerId"], reserved_id)
    assert_restorable_settings(api_data(
        api_base, token,
        f"/me/chat/read-receipts?conversationId={urllib.parse.quote(conversation_id, safe='')}",
    ))
    body = fixture_body(run_id, metadata["invocationId"])
    artifacts = []
    success = False
    try:
        with tempfile.TemporaryDirectory(prefix=f"gymsheet-h7-m4-{platform}-") as temporary:
            private_dir = pathlib.Path(temporary)
            private_dir.chmod(0o700)
            output_dir = private_dir / "maestro-output"
            output_dir.mkdir(mode=0o700)
            flows = []
            arrive_and_wait(evidence, barrier, run_id, values["case"], role,
                            identity["id"], ROLES, timeout=min(90, remaining(deadline)),
                            name="conversation-ready")
            arrive_and_wait(evidence, barrier, run_id, values["case"], role,
                            identity["id"], ROLES, timeout=min(90, remaining(deadline)),
                            name="fixture-sent")
            initial_flow = private_dir / "initial.yaml"
            initial_flow.write_text(build_observer_flow(identity["email"], conversation_id,
                                                        body, "initial"), encoding="utf-8")
            initial_flow.chmod(0o600)
            flows.append(initial_flow)
            run_maestro(maestro, platform, device_id, initial_flow, deadline, output_dir)
            artifacts.append(capture_artifact(platform, device_id, evidence, run_id,
                                              metadata["invocationId"], "initial-read"))
            close_flow = private_dir / "close-menu.yaml"
            close_flow.write_text(build_close_menu_flow(), encoding="utf-8")
            close_flow.chmod(0o600)
            run_maestro(maestro, platform, device_id, close_flow, deadline, output_dir)
            arrive_and_wait(evidence, barrier, run_id, values["case"], role,
                            identity["id"], ROLES, timeout=min(90, remaining(deadline)),
                            name="initial-read-visible")

            wait_for_receipt_state(api_base, token, conversation_id, False, False, deadline)
            disabled_flow = private_dir / "disabled.yaml"
            disabled_flow.write_text(build_observer_flow(identity["email"], conversation_id,
                                                         body, "disabled"), encoding="utf-8")
            disabled_flow.chmod(0o600)
            flows.append(disabled_flow)
            run_maestro(maestro, platform, device_id, disabled_flow, deadline, output_dir)
            artifacts.append(capture_artifact(platform, device_id, evidence, run_id,
                                              metadata["invocationId"], "disabled"))
            run_maestro(maestro, platform, device_id, close_flow, deadline, output_dir)
            arrive_and_wait(evidence, barrier, run_id, values["case"], role,
                            identity["id"], ROLES, timeout=min(90, remaining(deadline)),
                            name="disabled-visible")

            wait_for_receipt_state(api_base, token, conversation_id, True, True, deadline)
            restored_flow = private_dir / "restored.yaml"
            restored_flow.write_text(build_observer_flow(identity["email"], conversation_id,
                                                         body, "restored"), encoding="utf-8")
            restored_flow.chmod(0o600)
            run_maestro(maestro, platform, device_id, restored_flow, deadline, output_dir)
            run_maestro(maestro, platform, device_id, close_flow, deadline, output_dir)
            arrive_and_wait(evidence, barrier, run_id, values["case"], role,
                            identity["id"], ROLES, timeout=min(90, remaining(deadline)),
                            name="restored")
        success = True
    finally:
        if not success:
            for artifact in artifacts:
                try:
                    pathlib.Path(artifact["path"]).unlink()
                except OSError:
                    pass

    print(json.dumps({"runId": run_id, "case": values["case"], "role": role,
                      "apiActorId": identity["id"],
                      "assertions": {"readReceiptScopeSynced": True},
                      "artifacts": artifacts}))
    return 0


def main(role: str, platform: str) -> int:
    try:
        return run(role, platform, sys.argv[1:])
    except PairPreconditionError as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2
    except (OSError, RuntimeError, TimeoutError, ValueError, json.JSONDecodeError,
            subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1
