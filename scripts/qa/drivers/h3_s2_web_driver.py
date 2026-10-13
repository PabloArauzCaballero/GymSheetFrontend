#!/usr/bin/env python3
"""Runtime gate for fixed H3.S2 A_WEB/B_WEB Playwright drivers."""
from __future__ import annotations

import os
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
DRIVER = ROOT / "scripts/qa/h3_s2_web.mjs"
NODE_22 = pathlib.Path("/opt/homebrew/opt/node@22/bin/node")


def compatible_node() -> str | None:
    candidates = [os.environ.get("QA_NODE_PATH"), shutil.which("node"),
                  str(NODE_22) if NODE_22.is_file() else None]
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        safe_env = os.environ.copy()
        safe_env.pop("QA_TOKEN_A", None)
        safe_env.pop("QA_TOKEN_B", None)
        try:
            version = subprocess.run([candidate, "--version"], capture_output=True,
                                     text=True, timeout=3, check=False, env=safe_env).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            continue
        match = re.fullmatch(r"v(\d+)\.\d+\.\d+", version)
        if match and 20 <= int(match.group(1)) < 24:
            return candidate
    return None


def main(expected_case: str, expected_role: str) -> int:
    node = compatible_node()
    if not node:
        print("BLOCKED: compatible Node.js 20–23 runtime unavailable", file=sys.stderr)
        return 2
    if not DRIVER.is_file():
        print("FAIL: H3.S2 web driver implementation missing", file=sys.stderr)
        return 1
    args = sys.argv[1:]
    expected = {"--case": expected_case, "--role": expected_role}
    for key, value in expected.items():
        try:
            if args[args.index(key) + 1] != value:
                print(f"FAIL: driver invoked for wrong {key}", file=sys.stderr)
                return 1
        except (ValueError, IndexError):
            print(f"FAIL: missing {key}", file=sys.stderr)
            return 1
    return subprocess.run([node, str(DRIVER), *args], check=False).returncode
