"""Maestro role for the irreversible H7.S4.M5 disposable-pair acceptance."""
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

ROLE_DEADLINE_SECONDS = 150
API_TIMEOUT_SECONDS = 8
ROLES = ("A_ANDROID", "B_WEB")
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from pair_barrier import arrive_and_wait

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


class PairPreconditionError(ValueError):
    """A missing precondition detected before the irreversible disconnect."""


def require_disposable_pair(conversation_id: str | None, connection_id: str | None,
                            reserved_conversation_id: str | None,
                            reserved_connection_id: str | None) -> dict[str, str]:
    values = (conversation_id, connection_id, reserved_conversation_id, reserved_connection_id)
    if any(not isinstance(value, str) or not UUID.fullmatch(value) for value in values):
        raise PairPreconditionError("M5 requires valid reserved disposable conversation and connection UUIDs")
    if conversation_id.lower() != reserved_conversation_id.lower():
        raise PairPreconditionError("assigned conversation does not match the reserved disposable conversation")
    if connection_id.lower() != reserved_connection_id.lower():
        raise PairPreconditionError("assigned connection does not match the reserved disposable connection")
    return {"conversationId": conversation_id, "connectionId": connection_id}


def pair_actor_ids(metadata: dict, run_id: str, case: str, role: str, actor_id: str) -> dict[str, str]:
    expected = sorted(ROLES)
    if (metadata.get("runId") != run_id or metadata.get("case") != case
            or metadata.get("expectedRoles") != expected
            or not re.fullmatch(r"[0-9a-f]{32}", str(metadata.get("invocationId", "")))
            or not isinstance(metadata.get("expectedActorIds"), dict)
            or sorted(metadata["expectedActorIds"]) != expected):
        raise ValueError("barrier identity metadata mismatch")
    if role not in expected or metadata["expectedActorIds"].get(role) != actor_id:
        raise ValueError("role actor identity mismatch")
    peers = [metadata["expectedActorIds"][candidate] for candidate in expected if candidate != role]
    if len(peers) != 1 or not peers[0] or peers[0] == actor_id:
        raise ValueError("expected exactly one distinct pair actor")
    return {"actorId": actor_id, "peerId": peers[0]}


def find_reserved_conversation(conversations: list, peer_id: str, reserved_id: str) -> str:
    if not isinstance(conversations, list):
        raise ValueError("conversation list is invalid")
    pair = [row for row in conversations if row.get("otherUserId") == peer_id
            and row.get("systemKind") is None]
    if len(pair) != 1:
        raise PairPreconditionError("expected exactly one active conversation for the assigned pair")
    if (pair[0].get("conversationId") != reserved_id
            or pair[0].get("canWrite") is not True):
        raise PairPreconditionError("reserved conversation is not the only active writable chat for this pair")
    return reserved_id


def find_reserved_connection(connections: list, peer_id: str, reserved_id: str) -> str:
    if not isinstance(connections, list):
        raise ValueError("connection list is invalid")
    pair = [row for row in connections if row.get("status") == "ACCEPTED"
            and row.get("otherUserId") == peer_id]
    if len(pair) != 1:
        raise PairPreconditionError("expected exactly one accepted connection for the assigned peer")
    if pair[0].get("id") != reserved_id:
        raise PairPreconditionError("accepted connection does not match the reserved disposable connection")
    return reserved_id


def validate_history_fixture(messages: list, conversation_id: str) -> dict[str, str]:
    if not isinstance(messages, list):
        raise ValueError("conversation history is invalid")
    if any(message.get("conversationId") != conversation_id for message in messages):
        raise PairPreconditionError("history contains a message from another conversation")
    texts = [message for message in messages if message.get("type") == "text"
             and isinstance(message.get("body"), str) and message["body"].strip()]
    images = [message for message in messages if message.get("type") == "image"
              and message.get("id") and isinstance(message.get("mediaUrl"), str)
              and message["mediaUrl"].startswith("/")]
    if not texts:
        raise PairPreconditionError("reserved conversation has no visible text fixture")
    if not images:
        raise PairPreconditionError("reserved conversation has no accessible image fixture")
    return {"textBody": texts[-1]["body"], "imageMessageId": images[-1]["id"],
            "mediaUrl": images[-1]["mediaUrl"],
            "mediaEndpoint": f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}"
                             f"/messages/{urllib.parse.quote(images[-1]['id'], safe='')}/media"}


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_initial_flow(email: str, conversation_id: str, text_body: str) -> str:
    if not UUID.fullmatch(conversation_id) or not email or not text_body:
        raise ValueError("invalid M5 baseline fixture")
    return "\n".join([
        "appId: app.gymsheet.mobile", "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        f"- assertVisible: {yaml_quote(text_body)}",
        "- assertVisible: Abrir foto", "",
    ])


def build_resume_flow(text_body: str) -> str:
    if not text_body:
        raise ValueError("M5 baseline text fixture is required")
    return "\n".join([
        "appId: app.gymsheet.mobile", "---",
        "- pressKey: HOME",
        "- launchApp:",
        "    appId: app.gymsheet.mobile",
        "- assertVisible: Chat cerrado",
        "- assertVisible: El historial y los archivos de esta conversación ya no están disponibles.",
        f"- assertNotVisible: {yaml_quote(text_body)}",
        f"- assertNotVisible: {yaml_quote('Abrir foto')}", "",
    ])


def api_data(api_base: str, token: str, endpoint: str, method: str = "GET") -> dict | list:
    parsed = urllib.parse.urlsplit(api_base)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("invalid API base URL")
    if not endpoint.startswith("/") or ".." in endpoint:
        raise ValueError("invalid API endpoint")
    request = urllib.request.Request(api_base.rstrip("/") + endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            envelope = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"API request failed ({error.code})") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"API request unavailable ({type(error).__name__})") from error
    if not isinstance(envelope, dict) or envelope.get("ok") is not True or "data" not in envelope:
        raise RuntimeError("API success envelope missing or invalid")
    return envelope["data"]


def api_status(api_base: str, token: str, endpoint: str) -> int:
    request = urllib.request.Request(api_base.rstrip("/") + endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except urllib.error.URLError as error:
        raise RuntimeError("API status request unavailable") from error


def remaining(deadline: float) -> float:
    value = deadline - time.monotonic()
    if value <= 0:
        raise TimeoutError("M5 role deadline exceeded")
    return value


def run_maestro(maestro: str, device_id: str, flow: pathlib.Path,
                deadline: float, output_dir: pathlib.Path) -> None:
    command = [maestro, "test", "--device", device_id, "--test-output-dir",
               str(output_dir), str(flow)]
    try:
        result = subprocess.run(command, capture_output=True, text=True,
                                timeout=max(1, remaining(deadline)), check=False)
    except subprocess.TimeoutExpired as error:
        raise TimeoutError("M5 Maestro UI flow timed out") from error
    if result.returncode != 0:
        raise RuntimeError(f"M5 Maestro UI flow failed ({result.returncode})")


def capture_android(device_id: str, evidence: pathlib.Path, run_id: str,
                    invocation_id: str, state: str) -> dict:
    adb = os.environ.get("ADB_PATH") or shutil.which("adb")
    if not adb:
        raise PairPreconditionError("adb is unavailable")
    path = evidence / f"H7.S4.M5-A_ANDROID-{run_id}-{invocation_id}-{state}.png"
    result = subprocess.run([adb, "-s", device_id, "exec-out", "screencap", "-p"],
        capture_output=True, timeout=10, check=False)
    if result.returncode != 0 or not result.stdout.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Android screenshot failed")
    path.write_bytes(result.stdout)
    path.chmod(0o600)
    return {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def run(argv: list[str]) -> int:
    deadline = time.monotonic() + ROLE_DEADLINE_SECONDS
    values = {}
    index = 0
    while index < len(argv):
        if not argv[index].startswith("--") or index + 1 >= len(argv):
            raise ValueError("invalid M5 driver arguments")
        values[argv[index][2:]] = argv[index + 1]
        index += 2
    if any(not values.get(key) for key in ("case", "role", "run-id", "evidence-dir", "barrier-dir")):
        raise ValueError("required M5 driver argument missing")
    if values["case"] != "H7.S4.M5" or values["role"] != "A_ANDROID":
        raise ValueError("M5 mobile driver invoked for the wrong case or role")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", values["run-id"]):
        raise ValueError("invalid M5 run ID")
    if os.environ.get("QA_M5_DISPOSABLE_PAIR_ACK") != "H7.S4.M5":
        raise PairPreconditionError("explicit M5 disposable-pair acknowledgement is required")
    token, api_base = os.environ.get("QA_TOKEN_A"), os.environ.get("QA_API_BASE_URL")
    if not token or not api_base:
        raise PairPreconditionError("A token or API base URL is unavailable")
    required = require_disposable_pair(os.environ.get("QA_M5_DISPOSABLE_CONVERSATION_ID"),
        os.environ.get("QA_M5_DISPOSABLE_CONNECTION_ID"),
        os.environ.get("QA_M5_DISPOSABLE_CONVERSATION_ID"),
        os.environ.get("QA_M5_DISPOSABLE_CONNECTION_ID"))
    device_id = os.environ.get("QA_ANDROID_SERIAL")
    adb = os.environ.get("ADB_PATH") or shutil.which("adb")
    if not device_id or not adb:
        raise PairPreconditionError("Android serial or adb is unavailable")
    state = subprocess.run([adb, "-s", device_id, "get-state"], capture_output=True,
                           text=True, timeout=5, check=False)
    if state.returncode != 0 or state.stdout.strip() != "device":
        raise PairPreconditionError("assigned Android device is not connected")
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
    actors = pair_actor_ids(metadata, values["run-id"], values["case"], "A_ANDROID", identity.get("id"))
    conversation_id = find_reserved_conversation(
        api_data(api_base, token, "/me/conversations"), actors["peerId"], required["conversationId"])
    fixture = validate_history_fixture(api_data(api_base, token,
        f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}/messages?limit=40"), conversation_id)
    if api_status(api_base, token, fixture["mediaEndpoint"]) != 200:
        raise PairPreconditionError("reserved image fixture is not accessible before revocation")
    arrive_and_wait(evidence, barrier, values["run-id"], values["case"], "A_ANDROID",
        identity["id"], ROLES, timeout=min(90, remaining(deadline)), name="preflight-ready")

    artifacts = []
    success = False
    try:
        with tempfile.TemporaryDirectory(prefix="gymsheet-h7-m5-android-") as temporary:
            private = pathlib.Path(temporary)
            private.chmod(0o700)
            output_dir = private / "maestro-output"
            output_dir.mkdir(mode=0o700)
            initial = private / "initial.yaml"
            initial.write_text(build_initial_flow(identity["email"], conversation_id,
                                                  fixture["textBody"]), encoding="utf-8")
            initial.chmod(0o600)
            run_maestro(maestro, device_id, initial, deadline, output_dir)
            artifacts.append(capture_android(device_id, evidence, values["run-id"],
                                             metadata["invocationId"], "initial-visible"))
            arrive_and_wait(evidence, barrier, values["run-id"], values["case"], "A_ANDROID",
                identity["id"], ROLES, timeout=min(90, remaining(deadline)), name="history-visible")
            background = private / "background.yaml"
            background.write_text("appId: app.gymsheet.mobile\n---\n- pressKey: HOME\n", encoding="utf-8")
            background.chmod(0o600)
            run_maestro(maestro, device_id, background, deadline, output_dir)
            arrive_and_wait(evidence, barrier, values["run-id"], values["case"], "A_ANDROID",
                identity["id"], ROLES, timeout=min(90, remaining(deadline)), name="app-backgrounded")
            arrive_and_wait(evidence, barrier, values["run-id"], values["case"], "A_ANDROID",
                identity["id"], ROLES, timeout=min(90, remaining(deadline)), name="conversation-revoked")
            resume = private / "resume.yaml"
            resume.write_text(build_resume_flow(fixture["textBody"]), encoding="utf-8")
            resume.chmod(0o600)
            run_maestro(maestro, device_id, resume, deadline, output_dir)
            if api_status(api_base, token,
                f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}/messages?limit=40") != 404:
                raise RuntimeError("A history did not return 404 after conversation revocation")
            if api_status(api_base, token, fixture["mediaEndpoint"]) != 404:
                raise RuntimeError("A image URL did not return 404 after conversation revocation")
            artifacts.append(capture_android(device_id, evidence, values["run-id"],
                                             metadata["invocationId"], "revoked-on-resume"))
            arrive_and_wait(evidence, barrier, values["run-id"], values["case"], "A_ANDROID",
                identity["id"], ROLES, timeout=min(90, remaining(deadline)), name="history-cleared")
            success = True
    finally:
        if not success:
            for artifact in artifacts:
                try:
                    pathlib.Path(artifact["path"]).unlink()
                except OSError:
                    pass
    print(json.dumps({"runId": values["run-id"], "case": values["case"], "role": "A_ANDROID",
        "apiActorId": identity["id"], "assertions": {"revokedChatClearedOnForeground": True},
        "artifacts": artifacts}))
    return 0


def main() -> int:
    try:
        return run(sys.argv[1:])
    except PairPreconditionError as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
