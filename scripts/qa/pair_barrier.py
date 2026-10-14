"""Run-scoped filesystem rendezvous for concurrent social QA role drivers."""
from __future__ import annotations

import json
import math
import os
import pathlib
import re
import tempfile
import time
import uuid

_IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
_CASE = re.compile(r"^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$")
_INVOCATION_ID = re.compile(r"^[0-9a-f]{32}$")
DEFAULT_TIMEOUT_SECONDS = 90


def arrive_and_wait(evidence_dir: str | pathlib.Path, barrier_dir: str | pathlib.Path,
                    run_id: str, case: str, role: str, actor_id: str,
                    expected_roles: tuple[str, ...], timeout: float = DEFAULT_TIMEOUT_SECONDS,
                    interval: float = 0.1, name: str = "ready") -> tuple[str, ...]:
    """Publish one role arrival and wait until every expected role has arrived.

    The runner creates a fresh private barrier directory for each case invocation.
    Marker creation uses a same-directory hard link so a reader never sees a
    partially written JSON record. A duplicate role/name pair fails closed.
    """
    if not isinstance(run_id, str) or not _IDENTIFIER.fullmatch(run_id):
        raise ValueError("invalid run id")
    if not isinstance(case, str) or not _CASE.fullmatch(case):
        raise ValueError("invalid case")
    if not isinstance(role, str) or not _IDENTIFIER.fullmatch(role):
        raise ValueError("invalid role")
    if not isinstance(name, str) or not _IDENTIFIER.fullmatch(name):
        raise ValueError("invalid barrier name")
    if not isinstance(actor_id, str) or not actor_id or len(actor_id) > 200:
        raise ValueError("invalid actor id")
    if (not isinstance(expected_roles, (tuple, list)) or not expected_roles
            or any(not isinstance(item, str) or not _IDENTIFIER.fullmatch(item)
                   for item in expected_roles)
            or len(set(expected_roles)) != len(expected_roles) or role not in expected_roles):
        raise ValueError("invalid expected role set")
    if (not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or timeout <= 0
            or not isinstance(interval, (int, float)) or not math.isfinite(interval) or interval < 0):
        raise ValueError("timeout must be positive and interval nonnegative")

    root = pathlib.Path(evidence_dir).resolve(strict=True)
    directory = pathlib.Path(barrier_dir).resolve(strict=True)
    if not directory.is_dir() or not directory.is_relative_to(root) or directory == root:
        raise ValueError("barrier directory is outside evidence directory")
    try:
        identity = json.loads((directory / ".barrier.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("barrier identity metadata missing or invalid") from error
    expected_actor_ids = identity.get("expectedActorIds") if isinstance(identity, dict) else None
    invocation_id = identity.get("invocationId") if isinstance(identity, dict) else None
    if not isinstance(invocation_id, str) or not _INVOCATION_ID.fullmatch(invocation_id):
        raise ValueError("barrier invocation metadata missing or invalid")
    if (not isinstance(expected_actor_ids, dict)
            or set(expected_actor_ids) != set(expected_roles)
            or any(not isinstance(expected_actor, str) or not expected_actor
                   for expected_actor in expected_actor_ids.values())):
        raise ValueError("barrier actor metadata missing or invalid")
    expected_identity = {"runId": run_id, "case": case,
                         "expectedRoles": sorted(expected_roles),
                         "expectedActorIds": expected_actor_ids,
                         "invocationId": invocation_id}
    if identity != expected_identity:
        raise ValueError("barrier identity metadata mismatch")
    if identity["expectedActorIds"].get(role) != actor_id:
        raise ValueError("role actor identity mismatch")

    marker = directory / f"{name}--{role}.json"
    payload = json.dumps({"runId": run_id, "case": case, "role": role,
                          "actorId": actor_id, "name": name,
                          "invocationId": invocation_id},
                         sort_keys=True, separators=(",", ":")).encode("utf-8")
    temporary = directory / f".{role}.{uuid.uuid4().hex}.tmp"
    try:
        fd = os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        try:
            os.link(temporary, marker, follow_symlinks=False)
        except FileExistsError as error:
            raise ValueError("role already arrived at this barrier") from error
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass

    expected = tuple(sorted(expected_roles))
    deadline = time.monotonic() + timeout
    while True:
        arrived = []
        for expected_role in expected:
            path = directory / f"{name}--{expected_role}.json"
            if not path.exists():
                continue
            try:
                observed = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                raise ValueError(f"invalid arrival marker for {expected_role}") from error
            identity = {"runId": run_id, "case": case, "role": expected_role, "name": name,
                        "invocationId": invocation_id}
            if not isinstance(observed, dict) or any(observed.get(key) != value
                                                     for key, value in identity.items()):
                raise ValueError(f"arrival identity mismatch for {expected_role}")
            if not isinstance(observed.get("actorId"), str) or not observed["actorId"]:
                raise ValueError(f"arrival actor missing for {expected_role}")
            arrived.append(expected_role)
        if len(arrived) == len(expected):
            return expected
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            missing = sorted(set(expected) - set(arrived))
            raise TimeoutError(f"barrier {name} timed out; missing roles: {', '.join(missing)}")
        time.sleep(min(interval, remaining) if interval else 0)


def create_barrier_dir(evidence_dir: str | pathlib.Path, run_id: str,
                       case: str, expected_roles: tuple[str, ...],
                       expected_actor_ids: dict[str, str]) -> pathlib.Path:
    """Create a fresh, private barrier directory beneath a run's evidence root."""
    if (not isinstance(run_id, str) or not _IDENTIFIER.fullmatch(run_id)
            or not isinstance(case, str) or not _CASE.fullmatch(case)):
        raise ValueError("invalid run id or case")
    if (not isinstance(expected_roles, (tuple, list)) or not expected_roles
            or any(not isinstance(item, str) or not _IDENTIFIER.fullmatch(item)
                   for item in expected_roles)
            or len(set(expected_roles)) != len(expected_roles)):
        raise ValueError("invalid expected role set")
    if (not isinstance(expected_actor_ids, dict)
            or set(expected_actor_ids) != set(expected_roles)
            or any(not isinstance(actor_id, str) or not actor_id or len(actor_id) > 200
                   for actor_id in expected_actor_ids.values())):
        raise ValueError("invalid expected role actors")
    root = pathlib.Path(evidence_dir).resolve(strict=True)
    barrier_root = root / ".barriers"
    if barrier_root.is_symlink():
        raise ValueError("barrier root cannot be a symlink")
    barrier_root.mkdir(mode=0o700, exist_ok=True)
    resolved_root = barrier_root.resolve(strict=True)
    if not resolved_root.is_dir() or not resolved_root.is_relative_to(root):
        raise ValueError("barrier root is outside evidence directory")
    path = pathlib.Path(tempfile.mkdtemp(prefix=f"{run_id}-{case}-", dir=resolved_root))
    if not path.resolve(strict=True).is_relative_to(root):
        raise ValueError("created barrier directory is outside evidence directory")
    metadata = {"runId": run_id, "case": case,
                "expectedRoles": sorted(expected_roles),
                "expectedActorIds": expected_actor_ids,
                "invocationId": uuid.uuid4().hex}
    (path / ".barrier.json").write_text(
        json.dumps(metadata, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8")
    os.chmod(path / ".barrier.json", 0o600)
    return path
