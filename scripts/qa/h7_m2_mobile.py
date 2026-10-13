"""Pure preflight, observation, and cautious cleanup helpers for H7.S4.M2."""
from __future__ import annotations

import json
import math
import re
import urllib.parse

ROLES = ("A_ANDROID", "B_IOS", "B_WEB")
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
MAX_FFPROBE_OUTPUT_BYTES = 16_384
MAX_FFPROBE_STREAMS = 8
MAX_AUDIO_SECONDS = 120.0
TOMBSTONE_BODY = "Mensaje eliminado"


class PairPreconditionError(ValueError):
    """M2 cannot safely proceed with the assigned pair or fixture."""


def require_m2_fixture(device_ack: str | None, pair_ack: str | None,
                       conversation_id: str | None,
                       reserved_conversation_id: str | None) -> str:
    if device_ack != "H7.S4.M2":
        raise PairPreconditionError("M2 requires a dedicated Android device acknowledgement")
    if pair_ack != "H7.S4.M2":
        raise PairPreconditionError("M2 requires a disposable A/B pair acknowledgement")
    if (not isinstance(conversation_id, str) or not UUID.fullmatch(conversation_id)
            or not isinstance(reserved_conversation_id, str)
            or not UUID.fullmatch(reserved_conversation_id)):
        raise PairPreconditionError("M2 requires valid reserved disposable conversation UUIDs")
    if conversation_id.lower() != reserved_conversation_id.lower():
        raise PairPreconditionError("assigned conversation does not match the reserved disposable conversation")
    return conversation_id


def pair_actor_ids(metadata: dict, run_id: str, case: str,
                   role: str, actor_id: str) -> dict[str, str]:
    if (not isinstance(metadata, dict) or metadata.get("runId") != run_id
            or metadata.get("case") != case
            or metadata.get("expectedRoles") != sorted(ROLES)
            or not re.fullmatch(r"[0-9a-f]{32}", str(metadata.get("invocationId", "")))
            or not isinstance(metadata.get("expectedActorIds"), dict)
            or sorted(metadata["expectedActorIds"]) != sorted(ROLES)):
        raise ValueError("M2 barrier identity metadata mismatch")
    actors = metadata["expectedActorIds"]
    if role not in ROLES or actors.get(role) != actor_id:
        raise ValueError("M2 role actor identity mismatch")
    values = [actors.get(candidate) for candidate in ROLES]
    if any(not isinstance(value, str) or not value for value in values) or len(set(values)) != 2:
        raise ValueError("M2 requires exactly two distinct pair actor IDs")
    peer_ids = set(values) - {actor_id}
    if actor_id not in values or len(peer_ids) != 1:
        raise ValueError("M2 role is not assigned to the authenticated A/B pair")
    return {"actorId": actor_id, "peerId": next(iter(peer_ids))}


def find_reserved_pair_conversation(conversations: object, peer_id: str,
                                    reserved_id: str) -> str:
    if not isinstance(reserved_id, str) or not UUID.fullmatch(reserved_id):
        raise PairPreconditionError("M2 reserved conversation UUID is invalid")
    if not isinstance(conversations, list):
        raise ValueError("M2 conversation list is invalid")
    pair_chats = [row for row in conversations
                  if isinstance(row, dict) and row.get("otherUserId") == peer_id
                  and row.get("systemKind") is None]
    if len(pair_chats) != 1:
        raise PairPreconditionError("M2 expected exactly one direct conversation for the assigned pair")
    conversation = pair_chats[0]
    if conversation.get("conversationId") != reserved_id:
        raise PairPreconditionError("M2 direct conversation does not match the reserved disposable conversation")
    if conversation.get("canWrite") is not True:
        raise PairPreconditionError("M2 reserved conversation is not writable")
    return reserved_id


def require_empty_history(messages: object, conversation_id: str) -> list:
    if not isinstance(messages, list):
        raise ValueError("M2 conversation history is invalid")
    if any(not isinstance(message, dict) for message in messages):
        raise ValueError("M2 conversation history contains an invalid message")
    if any(message.get("conversationId") != conversation_id for message in messages):
        raise PairPreconditionError("M2 history contains a message from a different conversation")
    if messages:
        raise PairPreconditionError("M2 reserved conversation history is not empty")
    return messages


def require_microphone_granted(permission_status: object) -> bool:
    if not isinstance(permission_status, str) or permission_status.strip().lower() != "granted":
        raise PairPreconditionError("M2 Android RECORD_AUDIO permission must be granted before recording")
    return True


def parse_ffprobe_audio_metadata(output: str) -> dict[str, int | float | str]:
    if not isinstance(output, str):
        raise ValueError("ffprobe output must be text")
    try:
        output_size = len(output.encode("utf-8"))
    except UnicodeError as error:
        raise ValueError("ffprobe output is not valid UTF-8 text") from error
    if output_size > MAX_FFPROBE_OUTPUT_BYTES:
        raise ValueError("ffprobe output is too large")
    try:
        document = json.loads(output)
    except json.JSONDecodeError as error:
        raise ValueError("ffprobe output is not valid JSON") from error
    if not isinstance(document, dict):
        raise ValueError("ffprobe output must be an object")
    media_format = document.get("format")
    streams = document.get("streams")
    if not isinstance(media_format, dict) or not isinstance(streams, list):
        raise ValueError("ffprobe format or streams metadata is missing")
    if len(streams) == 0 or len(streams) > MAX_FFPROBE_STREAMS:
        raise ValueError("ffprobe stream count is outside the allowed bound")
    audio_streams = [stream for stream in streams
                     if isinstance(stream, dict) and stream.get("codec_type") == "audio"]
    if len(audio_streams) != 1:
        raise ValueError("ffprobe must report exactly one audio stream")

    format_name = media_format.get("format_name")
    if not isinstance(format_name, str) or not ({"mp4", "m4a"} & set(format_name.lower().split(","))):
        raise ValueError("ffprobe format is not MP4/M4A")
    duration_value = media_format.get("duration")
    if isinstance(duration_value, bool) or not isinstance(duration_value, (str, int, float)):
        raise ValueError("ffprobe audio duration is missing")
    try:
        duration = float(duration_value)
    except (TypeError, ValueError) as error:
        raise ValueError("ffprobe audio duration is invalid") from error
    if not math.isfinite(duration) or not 1.0 <= duration <= MAX_AUDIO_SECONDS:
        raise ValueError("ffprobe audio duration must be between 1 and 120 seconds")

    stream = audio_streams[0]
    codec = stream.get("codec_name")
    sample_rate_value = stream.get("sample_rate")
    channels = stream.get("channels")
    try:
        sample_rate = int(sample_rate_value)
    except (TypeError, ValueError) as error:
        raise ValueError("ffprobe audio sample rate is invalid") from error
    if isinstance(channels, bool) or not isinstance(channels, int):
        raise ValueError("ffprobe audio channel count is invalid")
    if codec != "aac":
        raise ValueError("ffprobe audio codec must be AAC")
    if not 8_000 <= sample_rate <= 192_000:
        raise ValueError("ffprobe audio sample rate is outside the supported bound")
    if channels not in (1, 2):
        raise ValueError("ffprobe audio must have one or two channels")
    return {
        "durationSeconds": duration,
        "formatName": format_name,
        "codecName": codec,
        "sampleRate": sample_rate,
        "channels": channels,
    }


def _validated_new_audio(messages: object, conversation_id: str,
                         sender_id: str) -> dict | None:
    if not isinstance(messages, list):
        raise ValueError("M2 polled history is invalid")
    if not messages:
        return None
    if len(messages) != 1:
        raise PairPreconditionError("M2 audio recovery is ambiguous: expected exactly one new message")
    message = messages[0]
    if not isinstance(message, dict):
        raise ValueError("M2 polled message is invalid")
    if message.get("conversationId") != conversation_id:
        raise PairPreconditionError("M2 new audio belongs to a different conversation")
    if message.get("senderId") != sender_id:
        raise PairPreconditionError("M2 new audio does not belong to the assigned sender")
    if message.get("type") != "audio" or message.get("mediaMimeType") != "audio/mp4":
        raise PairPreconditionError("M2 new sender message is not an M4A audio message")
    if (not isinstance(message.get("id"), str) or not UUID.fullmatch(message["id"])
            or not isinstance(message.get("mediaUrl"), str) or not message["mediaUrl"]
            or message.get("viewOnce") is not False or message.get("deletedAt") is not None):
        raise PairPreconditionError("M2 new audio lacks a valid ID/media URL or is not persistent audio")
    return message


def recover_audio_from_poll_snapshots(baseline_messages: object,
                                      history_snapshots: object,
                                      conversation_id: str,
                                      sender_id: str) -> dict:
    """Return only one new A audio from an initially empty, reserved conversation.

    This is deliberately observation-only. It never retries the media POST.
    """
    if isinstance(baseline_messages, list) and baseline_messages:
        raise PairPreconditionError("M2 audio recovery requires an empty baseline before upload")
    require_empty_history(baseline_messages, conversation_id)
    if not isinstance(history_snapshots, list):
        raise ValueError("M2 audio polling snapshots are invalid")
    for snapshot in history_snapshots:
        message = _validated_new_audio(snapshot, conversation_id, sender_id)
        if message is not None:
            return message
    raise TimeoutError("M2 polling observed no new audio message")


def global_delete_request_for_correlated_audio(message: object,
                                               conversation_id: str,
                                               sender_id: str,
                                               baseline_ids: set[str]) -> dict[str, str]:
    if not isinstance(message, dict):
        raise ValueError("M2 cleanup requires the correlated send message")
    if (not isinstance(message.get("id"), str) or not UUID.fullmatch(message["id"])
            or message["id"] in baseline_ids):
        raise PairPreconditionError("M2 cleanup refuses a pre-existing or invalid message ID")
    if message.get("conversationId") != conversation_id or message.get("senderId") != sender_id:
        raise PairPreconditionError("M2 cleanup requires the correlated sender message in the reserved conversation")
    if (message.get("type") != "audio" or message.get("mediaMimeType") != "audio/mp4"
            or not isinstance(message.get("mediaUrl"), str) or not message["mediaUrl"]
            or message.get("viewOnce") is not False or message.get("deletedAt") is not None):
        raise PairPreconditionError("M2 cleanup refuses a message other than the correlated live audio")
    return {
        "method": "DELETE",
        "endpoint": f"/me/conversations/{urllib.parse.quote(conversation_id, safe='')}"
                    f"/messages/{urllib.parse.quote(message['id'], safe='')}?scope=EVERYONE",
    }


def validate_global_delete_result(tombstone: object, message_id: str,
                                  conversation_id: str,
                                  media_endpoint_status: int) -> dict[str, object]:
    if (not isinstance(tombstone, dict)
            or tombstone.get("id") != message_id
            or tombstone.get("conversationId") != conversation_id
            or tombstone.get("scope") != "EVERYONE"
            or tombstone.get("type") != "text"
            or tombstone.get("body") != TOMBSTONE_BODY
            or tombstone.get("mediaUrl") is not None
            or not tombstone.get("deletedAt")):
        raise ValueError("M2 global-delete response is not the exact message tombstone")
    if media_endpoint_status != 404:
        raise ValueError("M2 deleted media endpoint did not return 404")
    return {
        "messageId": message_id,
        "tombstoneConfirmed": True,
        "mediaEndpointUnavailable": True,
        "physicalBlobDeletion": "not_verified",
    }
