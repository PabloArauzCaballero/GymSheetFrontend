"""Native Android sender and iOS listener roles for H7.S4.M2."""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import math
import os
import pathlib
import re
import shutil
import stat
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
from h7_m2_mobile import (
    PairPreconditionError,
    find_reserved_pair_conversation,
    global_delete_request_for_correlated_audio,
    pair_actor_ids,
    parse_ffprobe_audio_metadata,
    recover_audio_from_poll_snapshots,
    require_empty_history,
    require_m2_fixture,
    require_microphone_granted,
    validate_global_delete_result,
)

CASE = "H7.S4.M2"
ROLES = ("A_ANDROID", "B_IOS", "B_WEB")
ROLE_DEADLINE_SECONDS = 150
API_TIMEOUT_SECONDS = 8
MAX_MEDIA_BYTES = 25 * 1024 * 1024
ANDROID_PACKAGE = "app.gymsheet.mobile"
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def parse_role_args(argv: list[str], expected_role: str) -> dict[str, str]:
    parser = argparse.ArgumentParser(description=f"H7.S4.M2 {expected_role} Maestro role")
    parser.add_argument("--case", required=True)
    parser.add_argument("--role", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--barrier-dir", required=True)
    values = vars(parser.parse_args(argv))
    if values["case"] != CASE or values["role"] != expected_role:
        raise ValueError("M2 role driver invoked for the wrong case or role")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", values["run_id"]):
        raise ValueError("invalid M2 run ID")
    return {
        "case": values["case"], "role": values["role"], "run-id": values["run_id"],
        "evidence-dir": values["evidence_dir"], "barrier-dir": values["barrier_dir"],
    }


def acquire_m2_conversation_lock(conversation_id: str,
                                 lock_root: str | pathlib.Path | None = None) -> int:
    """Serialize A senders sharing the same reserved conversation across runs."""
    if not isinstance(conversation_id, str) or not UUID_RE.fullmatch(conversation_id):
        raise PairPreconditionError("M2 lock requires a valid reserved conversation UUID")
    root = pathlib.Path(lock_root) if lock_root is not None else pathlib.Path(tempfile.gettempdir()) / "gymsheet-h7-m2-locks"
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    root_info = root.lstat()
    if (stat.S_ISLNK(root_info.st_mode) or not stat.S_ISDIR(root_info.st_mode)
            or root_info.st_uid != os.getuid() or stat.S_IMODE(root_info.st_mode) & 0o077):
        raise PairPreconditionError("M2 exclusive lock directory is not private to this user")
    lock_path = root / (hashlib.sha256(conversation_id.lower().encode("ascii")).hexdigest() + ".lock")
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
    info = os.fstat(descriptor)
    if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid()
            or stat.S_IMODE(info.st_mode) & 0o077):
        os.close(descriptor)
        raise PairPreconditionError("M2 exclusive lock file is not private to this user")
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        os.close(descriptor)
        raise PairPreconditionError("reserved conversation already has an active M2 run") from error
    return descriptor


def release_m2_conversation_lock(descriptor: int) -> None:
    try:
        fcntl.flock(descriptor, fcntl.LOCK_UN)
    finally:
        os.close(descriptor)


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_android_record_flow(email: str, conversation_id: str) -> str:
    if not email or not UUID_RE.fullmatch(conversation_id):
        raise ValueError("invalid M2 Android UI identity or conversation")
    return "\n".join([
        f"appId: {ANDROID_PACKAGE}", "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        '- assertVisible: { text: "Grabar mensaje de voz", enabled: true }',
        '- tapOn: { text: "Grabar mensaje de voz" }', "",
        "- extendedWaitUntil:",
        '    visible: "Duración de grabación: 4 segundos"',
        "    timeout: 10000",
        '- assertVisible: { text: "Detener y enviar mensaje de voz", enabled: true }',
        '- tapOn: { text: "Detener y enviar mensaje de voz" }',
        '- assertVisible: { text: "Reproducir audio", enabled: true }', "",
    ])


def build_android_stop_flow() -> str:
    return "\n".join([
        f"appId: {ANDROID_PACKAGE}", "---",
        '- assertVisible: "Duración de grabación: 4 segundos"',
        '- assertVisible: { text: "Detener y enviar mensaje de voz", enabled: true }',
        '- tapOn: { text: "Detener y enviar mensaje de voz" }',
        '- assertVisible: { text: "Reproducir audio", enabled: true }', "",
    ])


def build_ios_preflight_flow(email: str, conversation_id: str) -> str:
    if not email or not UUID_RE.fullmatch(conversation_id):
        raise ValueError("invalid M2 iOS preflight identity or conversation")
    return "\n".join([
        f"appId: {ANDROID_PACKAGE}", "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        "- extendedWaitUntil:",
        '    visible: "Todavía no hay mensajes"',
        "    timeout: 20000",
        '- assertVisible: { text: "Escribe un mensaje", enabled: true }',
        '- assertVisible: { text: "Grabar mensaje de voz", enabled: true }', "",
    ])


def build_ios_playback_flow(email: str, conversation_id: str,
                            duration_seconds: int) -> str:
    if not email or not UUID_RE.fullmatch(conversation_id) or not 1 <= duration_seconds <= 120:
        raise ValueError("invalid M2 iOS UI identity, conversation, or duration")
    minutes, seconds = divmod(duration_seconds, 60)
    duration_label = f"{minutes}:{seconds:02d}"
    return "\n".join([
        f"appId: {ANDROID_PACKAGE}", "---",
        f"- openLink: {yaml_quote('gymsheet://profile')}",
        f"- assertVisible: {yaml_quote(email)}",
        f"- openLink: {yaml_quote(f'gymsheet://chat/{conversation_id}')}",
        "- extendedWaitUntil:",
        '    visible: { text: "Reproducir audio", enabled: true }',
        "    timeout: 120000",
        '- tapOn: { text: "Reproducir audio" }',
        "- extendedWaitUntil:",
        f'    visible: "/Progreso de audio: 0:0[1-9] de {duration_label}/"',
        "    timeout: 30000",
        "- takeScreenshot: audio-playback", "",
    ])


def maestro_command(maestro: str, platform: str, device_id: str,
                    flow: str, output_dir: str) -> list[str]:
    if platform == "android":
        device_flag = "--device"
    elif platform == "ios":
        device_flag = "--udid"
    else:
        raise ValueError("unsupported M2 native platform")
    return [maestro, "test", device_flag, device_id,
            "--test-output-dir", output_dir, flow]


def android_record_audio_status(dumpsys: str) -> str:
    match = re.search(r"android\.permission\.RECORD_AUDIO:\s*granted=(true|false)", dumpsys)
    if not match or match.group(1) != "true":
        raise PairPreconditionError("M2 Android RECORD_AUDIO must already be granted")
    return "granted"


def build_audio_evidence(role: str, conversation_id: str, message_id: str,
                         media_sha256: str, duration_seconds: float,
                         playback_advanced: bool = False,
                         recorded_duration_seconds: int | None = None) -> dict:
    if (role not in ("A_ANDROID", "B_IOS") or not UUID_RE.fullmatch(conversation_id)
            or not UUID_RE.fullmatch(message_id) or not SHA256_RE.fullmatch(media_sha256)
            or isinstance(duration_seconds, bool) or not isinstance(duration_seconds, (int, float))
            or not math.isfinite(duration_seconds)):
        raise ValueError("invalid M2 audio proof identity or media hash")
    duration_ms = int(duration_seconds * 1_000)
    duration_floor = duration_ms // 1_000
    if not (1_000 <= duration_ms <= 120_000 and 1 <= duration_floor <= 120):
        raise ValueError("M2 audio proof duration must be between 1 and 120 seconds")
    evidence = {
        "conversationId": conversation_id,
        "messageId": message_id,
        "mediaSha256": media_sha256,
        "mediaDurationMs": duration_ms,
    }
    if role == "A_ANDROID":
        if (playback_advanced is not False or isinstance(recorded_duration_seconds, bool)
                or recorded_duration_seconds != duration_floor):
            raise ValueError("M2 sender role requires matching recording duration and no playback claim")
        evidence["recordedDurationSeconds"] = recorded_duration_seconds
    else:
        if playback_advanced is not True or recorded_duration_seconds is not None:
            raise ValueError("M2 listener role requires observed playback and no recording claim")
        evidence["playerDurationSeconds"] = duration_floor
        evidence["playbackAdvanced"] = True
    return evidence


def validate_audio_media_route(message: dict, conversation_id: str) -> str:
    if (not isinstance(message, dict) or message.get("conversationId") != conversation_id
            or not UUID_RE.fullmatch(str(message.get("id", "")))):
        raise PairPreconditionError("M2 audio identity does not match the reserved conversation")
    expected = f"/me/conversations/{conversation_id}/messages/{message['id']}/media"
    if message.get("mediaUrl") != expected:
        raise PairPreconditionError("M2 audio media route does not match its exact message ID")
    return expected


def remaining(deadline: float) -> float:
    seconds = deadline - time.monotonic()
    if seconds <= 0:
        raise TimeoutError("M2 mobile role deadline exceeded")
    return seconds


def api_data(api_base: str, token: str, endpoint: str,
             method: str = "GET") -> dict | list:
    parsed = urllib.parse.urlsplit(api_base)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname
            or parsed.username or parsed.password or not endpoint.startswith("/")
            or ".." in endpoint):
        raise ValueError("invalid M2 API URL or endpoint")
    request = urllib.request.Request(
        api_base.rstrip("/") + endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        method=method,
    )
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(request, timeout=API_TIMEOUT_SECONDS) as response:
            envelope = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"M2 API request failed ({error.code})") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"M2 API request unavailable ({type(error).__name__})") from error
    if not isinstance(envelope, dict) or envelope.get("ok") is not True or "data" not in envelope:
        raise RuntimeError("M2 API success envelope missing or invalid")
    return envelope["data"]


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


def download_audio(api_base: str, token: str, media_endpoint: str,
                   timeout_seconds: float) -> bytes:
    parsed = urllib.parse.urlsplit(api_base)
    expected = re.fullmatch(
        r"/me/conversations/([0-9a-f-]{36})/messages/([0-9a-f-]{36})/media",
        media_endpoint, re.I,
    )
    if (parsed.scheme not in ("http", "https") or not parsed.hostname
            or parsed.username or parsed.password or not expected
            or not UUID_RE.fullmatch(expected.group(1))
            or not UUID_RE.fullmatch(expected.group(2))):
        raise ValueError("invalid M2 private audio endpoint")
    request = urllib.request.Request(api_base.rstrip("/") + media_endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "audio/*"})
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(request, timeout=min(API_TIMEOUT_SECONDS, timeout_seconds)) as response:
            if response.status != 200:
                raise RuntimeError(f"M2 audio download failed ({response.status})")
            data = response.read(MAX_MEDIA_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"M2 audio download failed ({error.code})") from error
    except urllib.error.URLError as error:
        raise RuntimeError("M2 audio download unavailable") from error
    if not data or len(data) > MAX_MEDIA_BYTES:
        raise RuntimeError("M2 audio is empty or exceeds the 25 MiB fixture bound")
    return data


def probe_audio_bytes(data: bytes, deadline: float) -> dict:
    if not data or len(data) > MAX_MEDIA_BYTES:
        raise ValueError("M2 ffprobe input is empty or exceeds the media bound")
    with tempfile.TemporaryDirectory(prefix="gymsheet-h7-m2-probe-") as temporary:
        directory = pathlib.Path(temporary)
        directory.chmod(0o700)
        path = directory / "audio.m4a"
        path.write_bytes(data)
        path.chmod(0o600)
        executable = os.environ.get("QA_FFPROBE_PATH") or shutil.which("ffprobe")
        if not executable:
            raise PairPreconditionError("ffprobe is unavailable")
        try:
            result = subprocess.run([
                executable, "-v", "error", "-show_entries",
                "format=format_name,duration:stream=codec_type,codec_name,sample_rate,channels",
                "-of", "json", str(path),
            ], capture_output=True, text=True, timeout=min(8, remaining(deadline)),
                check=False)
        except subprocess.TimeoutExpired as error:
            raise TimeoutError("M2 ffprobe timed out") from error
        if result.returncode != 0 or len(result.stdout.encode("utf-8")) > 16_384:
            raise RuntimeError("M2 ffprobe failed or returned oversized metadata")
        return parse_ffprobe_audio_metadata(result.stdout)


def wait_for_new_audio(api_base: str, token: str, history_endpoint: str,
                       conversation_id: str, sender_id: str,
                       deadline: float) -> dict:
    while remaining(deadline) > 0:
        messages = api_data(api_base, token, history_endpoint)
        try:
            return recover_audio_from_poll_snapshots(
                [], [messages], conversation_id, sender_id)
        except TimeoutError:
            time.sleep(min(0.25, remaining(deadline)))
    raise TimeoutError("M2 did not observe exactly one new sender audio in time")


def wait_for_sender_signal(barrier: pathlib.Path, metadata: dict,
                           deadline: float) -> None:
    path = barrier / "audio-sent--A_ANDROID.json"
    while remaining(deadline) > 0:
        try:
            marker = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            time.sleep(min(0.1, remaining(deadline)))
            continue
        expected = {"runId": metadata["runId"], "case": CASE,
                    "role": "A_ANDROID", "actorId": metadata["expectedActorIds"]["A_ANDROID"],
                    "name": "audio-sent", "invocationId": metadata["invocationId"]}
        if not isinstance(marker, dict) or any(marker.get(key) != value for key, value in expected.items()):
            raise ValueError("M2 audio-sent marker identity mismatch")
        return
    raise TimeoutError("M2 timed out waiting for Android audio-sent marker")


def wait_for_deleted_audio(api_base: str, token: str, history_endpoint: str,
                           message: dict, deadline: float) -> dict:
    media_endpoint = message["mediaUrl"]
    while remaining(deadline) > 0:
        messages = api_data(api_base, token, history_endpoint)
        tombstones = [item for item in messages if isinstance(item, dict)
                      and item.get("id") == message["id"]]
        if len(tombstones) == 1 and tombstones[0].get("deletedAt"):
            status = api_status(api_base, token, media_endpoint)
            return validate_global_delete_result(
                tombstones[0], message["id"], message["conversationId"], status)
        time.sleep(min(0.25, remaining(deadline)))
    raise TimeoutError("M2 did not observe the exact global-delete tombstone")


def api_status(api_base: str, token: str, endpoint: str) -> int:
    request = urllib.request.Request(api_base.rstrip("/") + endpoint,
        headers={"Authorization": f"Bearer {token}", "Accept": "audio/*"})
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(request, timeout=API_TIMEOUT_SECONDS) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except urllib.error.URLError as error:
        raise RuntimeError("M2 media status request unavailable") from error


def run_maestro(maestro: str, platform: str, device_id: str, flow_text: str,
                deadline: float, output_dir: pathlib.Path) -> None:
    flow = output_dir / f"{platform}-flow-{time.monotonic_ns()}.yaml"
    flow.write_text(flow_text, encoding="utf-8")
    flow.chmod(0o600)
    try:
        command = maestro_command(maestro, platform, device_id, str(flow), str(output_dir))
        result = subprocess.run(command, capture_output=True, text=True,
            timeout=max(1, remaining(deadline)), check=False)
    except subprocess.TimeoutExpired as error:
        raise TimeoutError("M2 Maestro UI flow timed out") from error
    if result.returncode != 0:
        raise RuntimeError(f"M2 Maestro {platform} UI flow failed ({result.returncode})")


def run_ios_preflight(context: dict, deadline: float) -> None:
    output = pathlib.Path(tempfile.mkdtemp(prefix="gymsheet-h7-m2-ios-preflight-"))
    output.chmod(0o700)
    try:
        flow = build_ios_preflight_flow(context["identity"]["email"], context["conversation"])
        run_maestro(context["maestro"], "ios", context["device"], flow, deadline, output)
    finally:
        shutil.rmtree(output, ignore_errors=True)


def _write_private_exclusive(path: pathlib.Path, data: bytes) -> None:
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
    except BaseException:
        try:
            path.unlink()
        except OSError:
            pass
        raise


def capture_android(device_id: str, evidence: pathlib.Path,
                    run_id: str, invocation_id: str) -> dict:
    adb = os.environ.get("ADB_PATH") or shutil.which("adb")
    if not adb:
        raise PairPreconditionError("adb is unavailable")
    path = evidence / f"H7.S4.M2-A_ANDROID-{run_id}-{invocation_id}.png"
    result = subprocess.run([adb, "-s", device_id, "exec-out", "screencap", "-p"],
        capture_output=True, timeout=10, check=False)
    if result.returncode != 0 or not result.stdout.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("M2 Android screenshot failed")
    _write_private_exclusive(path, result.stdout)
    return {"path": str(path), "sha256": hashlib.sha256(result.stdout).hexdigest()}


def capture_ios(device_id: str, evidence: pathlib.Path,
                run_id: str, invocation_id: str) -> dict:
    path = evidence / f"H7.S4.M2-B_IOS-{run_id}-{invocation_id}.png"
    with tempfile.TemporaryDirectory(prefix="gymsheet-h7-m2-ios-shot-") as temporary:
        directory = pathlib.Path(temporary)
        directory.chmod(0o700)
        temporary_path = directory / "capture.png"
        result = subprocess.run(["xcrun", "simctl", "io", device_id,
                                 "screenshot", str(temporary_path)], capture_output=True,
            text=True, timeout=10, check=False)
        if result.returncode != 0 or not temporary_path.is_file() or temporary_path.stat().st_size == 0:
            raise RuntimeError("M2 iOS screenshot failed")
        data = temporary_path.read_bytes()
    _write_private_exclusive(path, data)
    return {"path": str(path), "sha256": hashlib.sha256(data).hexdigest()}


def _paths(values: dict[str, str]) -> tuple[pathlib.Path, pathlib.Path]:
    evidence = pathlib.Path(values["evidence-dir"]).resolve(strict=True)
    barrier = pathlib.Path(values["barrier-dir"]).resolve(strict=True)
    if not evidence.is_dir() or not barrier.is_dir() or barrier == evidence or not barrier.is_relative_to(evidence):
        raise PairPreconditionError("M2 barrier must be a private child of the evidence directory")
    return evidence, barrier


def _preflight(role: str, values: dict[str, str], deadline: float):
    platform = "android" if role == "A_ANDROID" else "ios"
    token = os.environ.get("QA_TOKEN_A" if role == "A_ANDROID" else "QA_TOKEN_B")
    api_base = os.environ.get("QA_API_BASE_URL")
    reserved_id = os.environ.get("QA_M2_DISPOSABLE_CONVERSATION_ID")
    conversation_id = require_m2_fixture(
        os.environ.get("QA_M2_DISPOSABLE_DEVICE_ACK"),
        os.environ.get("QA_M2_DISPOSABLE_PAIR_ACK"), reserved_id, reserved_id)
    if not token or not api_base:
        raise PairPreconditionError(f"M2 {role} token or API base URL is unavailable")
    if role == "A_ANDROID":
        device_id = os.environ.get("QA_ANDROID_SERIAL")
        adb = os.environ.get("ADB_PATH") or shutil.which("adb")
        if not device_id or not adb:
            raise PairPreconditionError("M2 Android serial or adb is unavailable")
        state = subprocess.run([adb, "-s", device_id, "get-state"], capture_output=True,
            text=True, timeout=5, check=False)
        if state.returncode != 0 or state.stdout.strip() != "device":
            raise PairPreconditionError("assigned M2 Android device is not connected")
        package_info = subprocess.run([adb, "-s", device_id, "shell", "dumpsys", "package", ANDROID_PACKAGE],
            capture_output=True, text=True, timeout=8, check=False)
        if package_info.returncode != 0 or ANDROID_PACKAGE not in package_info.stdout:
            raise PairPreconditionError("M2 GymSheet Android app is not installed on the assigned device")
        require_microphone_granted(android_record_audio_status(package_info.stdout))
        device = device_id
    else:
        device = os.environ.get("QA_IOS_UDID")
        if not device:
            raise PairPreconditionError("M2 iOS simulator UDID is unavailable")
        state = subprocess.run(["xcrun", "simctl", "list", "devices", "booted"],
            capture_output=True, text=True, timeout=5, check=False)
        if state.returncode != 0 or f"({device}) (Booted)" not in state.stdout:
            raise PairPreconditionError("assigned M2 iOS simulator is not booted")
    maestro = os.environ.get("QA_MAESTRO_PATH") or shutil.which("maestro")
    if not maestro:
        candidate = pathlib.Path.home() / ".maestro/bin/maestro"
        maestro = str(candidate) if candidate.is_file() else None
    if not maestro:
        raise PairPreconditionError("Maestro CLI is unavailable")
    ffprobe = os.environ.get("QA_FFPROBE_PATH") or shutil.which("ffprobe")
    if not ffprobe:
        raise PairPreconditionError("ffprobe is unavailable")
    try:
        probe_status = subprocess.run([ffprobe, "-version"], capture_output=True,
            text=True, timeout=min(5, remaining(deadline)), check=False)
    except subprocess.TimeoutExpired as error:
        raise PairPreconditionError("ffprobe preflight timed out") from error
    if probe_status.returncode != 0:
        raise PairPreconditionError("ffprobe failed its preflight check")
    evidence, barrier = _paths(values)
    metadata = json.loads((barrier / ".barrier.json").read_text(encoding="utf-8"))
    identity = api_data(api_base, token, "/auth/me")
    if not isinstance(identity, dict) or not isinstance(identity.get("id"), str) or not identity.get("email"):
        raise PairPreconditionError(f"M2 {role} API identity is incomplete")
    actors = pair_actor_ids(metadata, values["run-id"], CASE, role, identity["id"])
    conversations = api_data(api_base, token, "/me/conversations")
    actual_conversation = find_reserved_pair_conversation(
        conversations, actors["peerId"], conversation_id)
    history_endpoint = f"/me/conversations/{urllib.parse.quote(actual_conversation, safe='')}/messages?limit=100"
    baseline = require_empty_history(api_data(api_base, token, history_endpoint), actual_conversation)
    return {
        "platform": platform, "device": device, "maestro": maestro,
        "evidence": evidence, "barrier": barrier, "metadata": metadata,
        "identity": identity, "actor": actors["actorId"], "peer": actors["peerId"],
        "conversation": actual_conversation, "historyEndpoint": history_endpoint,
        "baseline": baseline, "token": token, "apiBase": api_base,
    }


def _run_sender_with_lock(values: dict[str, str]) -> dict:
    deadline = time.monotonic() + ROLE_DEADLINE_SECONDS
    context = _preflight("A_ANDROID", values, deadline)
    artifacts = []
    message = None
    deletion_attempted = False
    upload_may_have_started = False
    success = False
    try:
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "A_ANDROID", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="preflight-ready")
        output = pathlib.Path(tempfile.mkdtemp(prefix="gymsheet-h7-m2-a-"))
        output.chmod(0o700)
        try:
            flow = build_android_record_flow(context["identity"]["email"], context["conversation"])
            upload_may_have_started = True
            run_maestro(context["maestro"], "android", context["device"], flow, deadline, output)
        finally:
            shutil.rmtree(output, ignore_errors=True)

        message = wait_for_new_audio(context["apiBase"], context["token"], context["historyEndpoint"],
            context["conversation"], context["actor"], deadline)
        media_endpoint = validate_audio_media_route(message, context["conversation"])
        data = download_audio(context["apiBase"], context["token"], media_endpoint, remaining(deadline))
        digest = hashlib.sha256(data).hexdigest()
        media = probe_audio_bytes(data, deadline)
        duration_floor = int(media["durationSeconds"])
        if duration_floor != 4:
            raise PairPreconditionError("M2 Android recording must produce a four-second media fixture")
        proof = build_audio_evidence("A_ANDROID", context["conversation"], message["id"], digest,
            media["durationSeconds"], recorded_duration_seconds=duration_floor)
        chat_link = yaml_quote("gymsheet://chat/" + context["conversation"])
        observe_flow = "\n".join([
            f"appId: {ANDROID_PACKAGE}", "---",
            f"- openLink: {chat_link}",
            '- assertVisible: { text: "Reproducir audio", enabled: true }', "",
        ])
        output = pathlib.Path(tempfile.mkdtemp(prefix="gymsheet-h7-m2-a-observe-"))
        output.chmod(0o700)
        try:
            run_maestro(context["maestro"], "android", context["device"], observe_flow, deadline, output)
        finally:
            shutil.rmtree(output, ignore_errors=True)
        artifacts.append(capture_android(context["device"], context["evidence"], values["run-id"],
                                        context["metadata"]["invocationId"]))
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "A_ANDROID", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="audio-sent")
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "A_ANDROID", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="playback-verified")

        deletion = global_delete_request_for_correlated_audio(message, context["conversation"],
            context["actor"], set())
        deletion_attempted = True
        try:
            tombstone = api_data(context["apiBase"], context["token"], deletion["endpoint"], method="DELETE")
        except (OSError, RuntimeError, TimeoutError, ValueError) as error:
            print(f"M2 global DELETE result is uncertain; request will not be retried ({error})", file=sys.stderr)
            raise
        cleanup = wait_for_deleted_audio(context["apiBase"], context["token"],
            context["historyEndpoint"], message, deadline)
        validate_global_delete_result(tombstone, message["id"], context["conversation"], 404)
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "A_ANDROID", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="message-deleted")
        success = True
        return {
            "runId": values["run-id"], "case": CASE, "role": "A_ANDROID",
            "apiActorId": context["actor"], "assertions": {"audioDurationAndPlaybackMatch": True},
            "audioEvidence": proof, "cleanupEvidence": cleanup, "artifacts": artifacts,
        }
    finally:
        if not success and upload_may_have_started and message is None:
            try:
                messages = api_data(context["apiBase"], context["token"], context["historyEndpoint"])
                message = recover_audio_from_poll_snapshots(
                    context["baseline"], [messages], context["conversation"], context["actor"])
            except TimeoutError:
                message = None
            except (OSError, RuntimeError, ValueError) as error:
                print(f"M2 cleanup uncertain: could not recover one exact sender audio ({error})", file=sys.stderr)
        if not success and message is not None and not deletion_attempted:
            # One guarded cleanup attempt for the exact correlated audio; never repeat a DELETE.
            try:
                target = global_delete_request_for_correlated_audio(
                    message, context["conversation"], context["actor"], set())
                deletion_attempted = True
                api_data(context["apiBase"], context["token"], target["endpoint"], method="DELETE")
            except (OSError, RuntimeError, ValueError, TimeoutError) as error:
                print(f"M2 cleanup uncertain for correlated message {message.get('id')}: {error}", file=sys.stderr)
        if not success:
            for artifact in artifacts:
                try:
                    pathlib.Path(artifact["path"]).unlink()
                except OSError:
                    pass


def run_sender(values: dict[str, str]) -> dict:
    reserved_id = os.environ.get("QA_M2_DISPOSABLE_CONVERSATION_ID", "")
    descriptor = acquire_m2_conversation_lock(reserved_id)
    try:
        return _run_sender_with_lock(values)
    finally:
        release_m2_conversation_lock(descriptor)


def run_listener(values: dict[str, str]) -> dict:
    deadline = time.monotonic() + ROLE_DEADLINE_SECONDS
    context = _preflight("B_IOS", values, deadline)
    artifacts = []
    success = False
    try:
        run_ios_preflight(context, deadline)
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "B_IOS", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="preflight-ready")
        wait_for_sender_signal(context["barrier"], context["metadata"], deadline)
        message = wait_for_new_audio(context["apiBase"], context["token"], context["historyEndpoint"],
            context["conversation"], context["peer"], deadline)
        media_endpoint = validate_audio_media_route(message, context["conversation"])
        data = download_audio(context["apiBase"], context["token"], media_endpoint, remaining(deadline))
        digest = hashlib.sha256(data).hexdigest()
        media = probe_audio_bytes(data, deadline)
        duration_floor = int(media["durationSeconds"])
        output = pathlib.Path(tempfile.mkdtemp(prefix="gymsheet-h7-m2-ios-"))
        output.chmod(0o700)
        try:
            flow = build_ios_playback_flow(context["identity"]["email"], context["conversation"], duration_floor)
            run_maestro(context["maestro"], "ios", context["device"], flow, deadline, output)
        finally:
            shutil.rmtree(output, ignore_errors=True)
        artifacts.append(capture_ios(context["device"], context["evidence"], values["run-id"],
                                     context["metadata"]["invocationId"]))
        proof = build_audio_evidence("B_IOS", context["conversation"], message["id"], digest,
            media["durationSeconds"], playback_advanced=True)
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "B_IOS", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="audio-sent")
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "B_IOS", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="playback-verified")
        deletion_proof = wait_for_deleted_audio(context["apiBase"], context["token"],
            context["historyEndpoint"], message, deadline)
        arrive_and_wait(context["evidence"], context["barrier"], values["run-id"], CASE,
            "B_IOS", context["actor"], ROLES, timeout=min(90, remaining(deadline)), name="message-deleted")
        success = True
        return {
            "runId": values["run-id"], "case": CASE, "role": "B_IOS",
            "apiActorId": context["actor"], "assertions": {"audioDurationAndPlaybackMatch": True},
            "audioEvidence": proof, "cleanupEvidence": deletion_proof,
            "artifacts": artifacts,
        }
    finally:
        if not success:
            for artifact in artifacts:
                try:
                    pathlib.Path(artifact["path"]).unlink()
                except OSError:
                    pass


def main(role: str) -> int:
    try:
        values = parse_role_args(sys.argv[1:], role)
        result = run_sender(values) if role == "A_ANDROID" else run_listener(values)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except PairPreconditionError as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2
    except (OSError, RuntimeError, TimeoutError, ValueError, json.JSONDecodeError,
            subprocess.SubprocessError, argparse.ArgumentError) as error:
        print(str(error), file=sys.stderr)
        return 1

