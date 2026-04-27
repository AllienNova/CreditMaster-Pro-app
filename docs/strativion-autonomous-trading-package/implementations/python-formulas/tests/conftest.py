"""Test configuration: add the python-formulas dir to sys.path BEFORE pytest
collects any test, so sibling modules can be imported as top-level names
without going through the package __init__.py.
"""
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
