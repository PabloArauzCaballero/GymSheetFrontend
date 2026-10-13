#!/usr/bin/env python3
"""Read-only Android observer for the H7.S4.M4 receipt-scope scenario."""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h7_m4_mobile import main

if __name__ == "__main__":
    sys.exit(main("A_ANDROID", "android"))
