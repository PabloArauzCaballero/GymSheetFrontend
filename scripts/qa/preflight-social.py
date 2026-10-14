#!/usr/bin/env python3
"""Create a sanitized, read-only preflight manifest for social QA runs."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
REPOS = {
    "frontend": ROOT,
    "backend": ROOT.parent / "GymSheetBackend",
    "recommendations": ROOT.parent / "GymSheetRecommendations",
}


def command(args: list[str], timeout: float = 4) -> dict[str, object]:
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
        return {"available": True, "exitCode": result.returncode, "output": result.stdout.strip()[:500]}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"available": False, "reason": type(error).__name__}


def repo_state(path: pathlib.Path) -> dict[str, object]:
    if not (path / ".git").exists():
        return {"present": path.exists(), "git": False}
    branch = command(["git", "-C", str(path), "branch", "--show-current"])
    head = command(["git", "-C", str(path), "rev-parse", "HEAD"])
    status = command(["git", "-C", str(path), "status", "--porcelain"])
    return {
        "present": True,
        "git": True,
        "branch": branch.get("output"),
        "sha": head.get("output") if head.get("exitCode") == 0 else None,
        "dirty": bool(status.get("output")),
    }


def health(url: str) -> dict[str, object]:
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname or ""
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if parsed.port:
        host = f"{host}:{parsed.port}"
    safe_base = urllib.parse.urlunsplit((parsed.scheme, host, parsed.path.rstrip("/"), "", ""))
    endpoints: dict[str, object] = {}
    for suffix in ("/health/live", "/health/ready"):
        target = safe_base + suffix
        try:
            with urllib.request.urlopen(target, timeout=2) as response:
                endpoints[suffix] = {"status": response.status}
        except urllib.error.HTTPError as error:
            endpoints[suffix] = {"status": error.code}
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            endpoints[suffix] = {"status": "unavailable", "reason": type(error).__name__}
    return {"base": safe_base, "endpoints": endpoints}


def devices() -> dict[str, object]:
    simctl = command(["xcrun", "simctl", "list", "devices", "booted"])
    adb_path = os.environ.get("ADB_PATH") or shutil.which("adb")
    if not adb_path:
        candidate = pathlib.Path.home() / "Library/Android/sdk/platform-tools/adb"
        adb_path = str(candidate) if candidate.exists() else "adb"
    adb = command([adb_path, "devices", "-l"])
    ios_devices = []
    if simctl.get("available") and simctl.get("exitCode") == 0:
        import re
        ios_devices = [
            {"name": match.group(1), "udid": match.group(2)}
            for line in str(simctl.get("output", "")).splitlines()
            if (match := re.match(r"^\s*(.*?)\s+\(([A-Fa-f0-9-]{36})\) \(Booted\)", line))
        ]
    android_count = 0
    if adb.get("available") and adb.get("exitCode") == 0:
        android_count = sum(1 for line in str(adb.get("output", "")).splitlines()[1:] if "\tdevice" in line)
    return {"iosBooted": ios_devices, "androidConnectedCount": android_count}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=pathlib.Path, help="Manifest destination; defaults to stdout")
    parser.add_argument("--api-base-url", default=os.environ.get("SOCIAL_QA_API_BASE_URL", "http://localhost:3000"))
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    manifest = {
        "schemaVersion": 1,
        "runId": str(uuid.uuid4()),
        "createdAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "environment": {"os": platform.platform(), "python": platform.python_version()},
        "tools": {"node": command(["node", "--version"]), "yarn": command(["yarn", "--version"])},
        "repositories": {name: repo_state(path) for name, path in REPOS.items()},
        "devices": devices(),
        "api": health(args.api_base_url),
        "secretsIncluded": False,
    }
    rendered = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
        print(f"manifest={args.output} runId={manifest['runId']}")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
