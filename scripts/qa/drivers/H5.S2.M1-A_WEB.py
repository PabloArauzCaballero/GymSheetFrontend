#!/usr/bin/env python3
"""Node runtime selector for the H5.S2.M1 A_WEB Playwright role."""
from __future__ import annotations

import os
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
DRIVER = ROOT / "scripts/qa/h5_s2_m1_web.mjs"
NODE_22 = pathlib.Path("/opt/homebrew/opt/node@22/bin/node")


def compatible_node() -> str | None:
    candidates = [os.environ.get("QA_NODE_PATH"), shutil.which("node"),
                  str(NODE_22) if NODE_22.is_file() else None]
    seen = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        try:
            probe_env = os.environ.copy()
            probe_env.pop("QA_TOKEN_A", None)
            probe_env.pop("QA_TOKEN_B", None)
            version = subprocess.run([candidate, "--version"], capture_output=True,
                                     text=True, timeout=3, check=False,
                                     env=probe_env).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            continue
        match = re.fullmatch(r"v(\d+)\.\d+\.\d+", version)
        if match and 20 <= int(match.group(1)) < 24:
            return candidate
    return None


def main() -> int:
    node = compatible_node()
    if not node:
        print("BLOCKED: compatible Node.js 20–23 runtime unavailable", file=sys.stderr)
        return 2
    if not DRIVER.is_file():
        print("FAIL: H5.S2.M1 web driver implementation missing", file=sys.stderr)
        return 1
    completed = subprocess.run([node, str(DRIVER), *sys.argv[1:]], check=False)
    return completed.returncode


if __name__ == "__main__":
    sys.exit(main())
