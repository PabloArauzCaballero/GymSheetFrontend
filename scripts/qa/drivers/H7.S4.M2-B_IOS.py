#!/usr/bin/env python3
"""iOS listener role for H7.S4.M2 native audio acceptance."""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h7_m2_mobile_roles import main

if __name__ == "__main__":
    sys.exit(main("B_IOS"))
