#!/usr/bin/env python3
"""Maestro A_ANDROID role for H7.S4.M1 microphone permission acceptance."""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h7_m1_mobile import main

if __name__ == "__main__":
    sys.exit(main())
