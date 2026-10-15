#!/usr/bin/env python3
"""Maestro-backed A_IOS role for the H7.S4.M3 cross-client edit scenario."""
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
ROLES = ("A_IOS", "B_WEB")
ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from pair_barrier import arrive_and_wait


class PairPreconditionError(Exception):
    pass


def pair_actor_ids(metadata: dict, run_id: str, case: str, role: str,
                   actor_id: str, roles: tuple[str, ...]) -> dict[str, str]:
    expected = sorted(roles)
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


def fixture_bodies(run_id: str, invocation_id: str) -> tuple[str, str]:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run_id):
        raise ValueError("invalid run ID")
    if not re.fullmatch(r"[0-9a-f]{32}", invocation_id):
        raise ValueError("invalid invocation ID")
    prefix = f"H7.S4.M3 {run_id} {invocation_id}"
    return f"{prefix} original", f"{prefix} edited"


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_send_flow(email: str, conversation_id: str, original_body: str) -> str:
    if not re.fullmatch(r"[0-9a-f-]{36}", conversation_id, flags=re.IGNORECASE):
        raise ValueError("invalid conversation ID")
    send_commands = [
        "appId: app.gymsheet.mobile",
        "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        f"- tapOn: {yaml_quote('Escribe un mensaje…')}",
        f"- inputText: {yaml_quote(original_body)}",
        f"- tapOn: {yaml_quote('Enviar mensaje')}",
        f"- assertVisible: {yaml_quote(original_body)}",
    ]

    return "\n".join(send_commands) + "\n"


def build_edit_flow(message_id: str, edited_body: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                        message_id, flags=re.IGNORECASE):
        raise ValueError("invalid owned message ID")
    edit_commands = [
        "appId: app.gymsheet.mobile",
        "---",
        "- tapOn:",
        f"    id: {yaml_quote(f'chat-message-edit-{message_id}')}",
        f"- tapOn: {yaml_quote('Editar mensaje actual')}",
        "- eraseText: 200",
        f"- inputText: {yaml_quote(edited_body)}",
        "- assertVisible:",
        f"    text: {yaml_quote('Editar mensaje actual')}",
        "    focused: true",
        '- takeScreenshot: "edit-keyboard-open-before-save"',
        f"- tapOn: {yaml_quote('Guardar edición')}",
        f"- assertVisible: {yaml_quote(edited_body)}",
        f"- assertVisible: {yaml_quote('Mensaje editado')}",
    ]
    return "\n".join(edit_commands) + "\n"


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


def find_owned_message(messages: object, conversation_id: str, actor_id: str,
                       bodies: tuple[str, ...]) -> dict | None:
    if not isinstance(messages, list):
        return None
    return next((message for message in messages if isinstance(message, dict)
                 and message.get("conversationId") == conversation_id
                 and message.get("senderId") == actor_id
                 and message.get("body") in bodies), None)


def verify_edited_message(original: dict, edited: dict, edited_body: str) -> str:
    message_id = original.get("id")
    if (not message_id or edited.get("id") != message_id
            or edited.get("type") != "text" or edited.get("body") != edited_body
            or not edited.get("editedAt")):
        raise RuntimeError("edit did not persist on the same message with editedAt")
    return message_id


def messages_for(api_base: str, token: str, conversation_id: str) -> list:
    messages = api_data(
        api_base, token,
        f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}/messages?limit=100",
    )
    if not isinstance(messages, list):
        raise RuntimeError("conversation messages response is invalid")
    return messages


def wait_for_owned_message(api_base: str, token: str, conversation_id: str,
                           actor_id: str, bodies: tuple[str, ...], deadline: float) -> dict:
    while time.monotonic() < deadline:
        message = find_owned_message(messages_for(api_base, token, conversation_id),
                                     conversation_id, actor_id, bodies)
        if message:
            return message
        time.sleep(min(0.25, max(0, deadline - time.monotonic())))
    raise TimeoutError("run-owned message was not observed before timeout")


def cleanup_owned_fixture(api_base: str, token: str, conversation_id: str,
                          actor_id: str, bodies: tuple[str, ...],
                          message_id: str | None) -> str | None:
    if message_id is None:
        fixture = find_owned_message(messages_for(api_base, token, conversation_id),
                                     conversation_id, actor_id, bodies)
        message_id = fixture.get("id") if fixture else None
    if message_id:
        api_data(api_base, token,
                 f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}/messages/"
                 f"{urllib.parse.quote(message_id, safe='')}?scope=EVERYONE",
                 method="DELETE")
    return message_id


def arrive_at_barrier(evidence_dir: pathlib.Path, barrier_dir: pathlib.Path,
                      run_id: str, case: str, role: str, actor_id: str,
                      name: str, deadline: float) -> None:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("role deadline exceeded before barrier")
    arrive_and_wait(evidence_dir, barrier_dir, run_id, case, role, actor_id,
                    ROLES, timeout=min(90, remaining), name=name)


def parse_args(args: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    index = 0
    while index < len(args):
        key = args[index]
        if not key.startswith("--") or index + 1 >= len(args):
            raise ValueError("invalid driver arguments")
        values[key[2:]] = args[index + 1]
        index += 2
    required = ("case", "role", "run-id", "evidence-dir", "barrier-dir")
    if any(not values.get(key) for key in required):
        raise ValueError("required driver argument missing")
    return {"case": values["case"], "role": values["role"], "runId": values["run-id"],
            "evidenceDir": values["evidence-dir"], "barrierDir": values["barrier-dir"]}


def blocked(message: str) -> int:
    print(f"BLOCKED: {message}", file=sys.stderr)
    return 2


def run(options: dict[str, str]) -> int:
    deadline = time.monotonic() + ROLE_DEADLINE_SECONDS
    if options["case"] != "H7.S4.M3" or options["role"] != "A_IOS":
        raise ValueError("this driver only supports H7.S4.M3 A_IOS")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", options["runId"]):
        raise ValueError("invalid run ID")
    token = os.environ.get("QA_TOKEN_A")
    api_base = os.environ.get("QA_API_BASE_URL")
    udid = os.environ.get("QA_IOS_UDID")
    if not token or not api_base or not udid:
        return blocked("A_IOS token, API base URL, or simulator UDID is unavailable")
    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        candidate = pathlib.Path.home() / ".maestro/bin/maestro"
        maestro = str(candidate) if candidate.is_file() else None
    if not maestro:
        return blocked("Maestro CLI is unavailable")
    simctl = shutil.which("xcrun")
    if not simctl:
        return blocked("Xcode simctl is unavailable")
    state = subprocess.run([simctl, "simctl", "list", "devices", "booted"],
                           capture_output=True, text=True, timeout=5, check=False)
    if state.returncode != 0 or f"({udid}) (Booted)" not in state.stdout:
        return blocked("assigned iOS simulator is not booted")

    metadata = json.loads((pathlib.Path(options["barrierDir"]) / ".barrier.json")
                          .read_text(encoding="utf-8"))
    identity = api_data(api_base, token, "/auth/me")
    if not isinstance(identity, dict) or not isinstance(identity.get("id"), str) or not identity.get("email"):
        raise ValueError("A API identity is incomplete")
    actors = pair_actor_ids(metadata, options["runId"], options["case"], options["role"],
                            identity["id"], ROLES)
    conversation = api_data(api_base, token, "/me/conversations", method="POST",
                            body={"otherUserId": actors["peerId"]})
    conversation_id = conversation.get("conversationId") if isinstance(conversation, dict) else None
    uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
    if not isinstance(conversation_id, str) or not re.fullmatch(uuid_pattern, conversation_id, re.IGNORECASE):
        raise ValueError("pair conversation response is invalid")

    original, edited = fixture_bodies(options["runId"], metadata["invocationId"])
    evidence = pathlib.Path(options["evidenceDir"]).resolve(strict=True)
    barrier = pathlib.Path(options["barrierDir"])
    artifact = evidence / f"H7.S4.M3-A_IOS-{options['runId']}-{metadata['invocationId']}.png"
    keyboard_artifact = evidence / f"H7.S4.M3-A_IOS-keyboard-{options['runId']}-{metadata['invocationId']}.png"
    send_flow = build_send_flow(identity["email"], conversation_id, original)
    created_message_id: str | None = None
    success = False
    try:
        with tempfile.TemporaryDirectory(prefix="gymsheet-h7-ios-") as temporary:
            private_dir = pathlib.Path(temporary)
            private_dir.chmod(0o700)
            send_flow_path = private_dir / "send-message.yaml"
            send_flow_path.write_text(send_flow, encoding="utf-8")
            send_flow_path.chmod(0o600)
            output_dir = private_dir / "maestro-output"
            output_dir.mkdir(mode=0o700)
            arrive_at_barrier(evidence, barrier, options["runId"], options["case"],
                              options["role"], identity["id"], "conversation-ready", deadline)
            command = [maestro, "test", "--udid", udid, "--test-output-dir", str(output_dir)]
            sent = subprocess.run([*command, str(send_flow_path)], capture_output=True, text=True,
                                  timeout=max(1, deadline - time.monotonic()), check=False)
            if sent.returncode != 0:
                raise RuntimeError(f"Maestro send flow failed ({sent.returncode})")

            message = wait_for_owned_message(api_base, token, conversation_id, identity["id"],
                                             (original,), deadline)
            created_message_id = message.get("id")
            if not created_message_id or message.get("type") != "text":
                raise RuntimeError("original message fixture is invalid")
            arrive_at_barrier(evidence, barrier, options["runId"], options["case"],
                              options["role"], identity["id"], "initial-visible", deadline)

            edit_flow_path = private_dir / "edit-message.yaml"
            edit_flow_path.write_text(build_edit_flow(created_message_id, edited), encoding="utf-8")
            edit_flow_path.chmod(0o600)
            edited_flow = subprocess.run([*command, str(edit_flow_path)], capture_output=True,
                                         text=True, timeout=max(1, deadline - time.monotonic()),
                                         check=False)
            if edited_flow.returncode != 0:
                raise RuntimeError(f"Maestro edit flow failed ({edited_flow.returncode})")
            keyboard_captures = list(output_dir.rglob("edit-keyboard-open-before-save.png"))
            if len(keyboard_captures) != 1 or not keyboard_captures[0].is_file():
                raise RuntimeError("keyboard-open pre-save screenshot is missing")
            shutil.copyfile(keyboard_captures[0], keyboard_artifact)
            keyboard_artifact.chmod(0o600)

        message = wait_for_owned_message(api_base, token, conversation_id, identity["id"],
                                         (edited,), deadline)
        created_message_id = verify_edited_message(
            {"id": created_message_id}, message, edited,
        )
        screenshot = subprocess.run([simctl, "simctl", "io", udid, "screenshot", str(artifact)],
                                   capture_output=True, text=True, timeout=10, check=False)
        if screenshot.returncode != 0 or not artifact.is_file() or artifact.stat().st_size == 0:
            raise RuntimeError("iOS screenshot capture failed")
        artifact.chmod(0o600)
        arrive_at_barrier(evidence, barrier, options["runId"], options["case"],
                          options["role"], identity["id"], "edited-visible", deadline)
        success = True
    finally:
        pending_error = sys.exc_info()[0] is not None
        cleanup_error = None
        try:
            created_message_id = cleanup_owned_fixture(
                api_base, token, conversation_id, identity["id"], (original, edited),
                created_message_id,
            )
        except Exception as error:
            cleanup_error = error
        if not success or cleanup_error:
            for private_artifact in (artifact, keyboard_artifact):
                if private_artifact.exists():
                    try:
                        private_artifact.unlink()
                    except OSError as error:
                        if cleanup_error is None:
                            cleanup_error = error
        if cleanup_error:
            if pending_error:
                print(f"fixture cleanup failed: {type(cleanup_error).__name__}", file=sys.stderr)
            else:
                raise RuntimeError(f"fixture cleanup failed ({type(cleanup_error).__name__})") from cleanup_error
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    keyboard_digest = hashlib.sha256(keyboard_artifact.read_bytes()).hexdigest()
    print(json.dumps({
        "runId": options["runId"], "case": options["case"], "role": options["role"],
        "apiActorId": identity["id"],
        "assertions": {
            "editVisibleAcrossClients": True,
            "editComposerFocusedAtSave": True,
        },
        "artifacts": [
            {"path": str(artifact), "sha256": digest},
            {
                "path": str(keyboard_artifact),
                "sha256": keyboard_digest,
                "evidenceType": "editComposerFocusedBeforeSave",
            },
        ],
    }))
    return 0


def main() -> int:
    try:
        return run(parse_args(sys.argv[1:]))
    except PairPreconditionError:
        return blocked("A/B actors do not have an accepted chat connection")
    except (OSError, RuntimeError, TimeoutError, ValueError, json.JSONDecodeError,
            subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
