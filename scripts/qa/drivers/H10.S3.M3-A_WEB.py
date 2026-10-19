#!/usr/bin/env python3
"""Fixed Playwright role driver for the H10 calendar export scenario."""
from __future__ import annotations

import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts" / "qa" / "h10_s3_m3_web.mjs"


def main() -> int:
    node = os.environ.get("QA_NODE_PATH") or shutil.which("node")
    if not node:
        print("BLOCKED: Node.js is unavailable", file=sys.stderr)
        return 2
    result = subprocess.run([node, str(SCRIPT), *sys.argv[1:]], capture_output=True,
                            text=True, timeout=145, check=False)
    if result.stdout:
        sys.stdout.write(result.stdout)
    if result.stderr:
        sys.stderr.write(result.stderr)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
