#!/usr/bin/env python3
"""iOS A role for the isolated H5.S2.M1 swipe fixture."""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from h5_s2_m1_native import main

if __name__ == "__main__":
    raise SystemExit(main("ios"))
