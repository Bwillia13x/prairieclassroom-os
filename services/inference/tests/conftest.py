"""Shared fixtures for inference harness tests."""
import sys
from pathlib import Path

# Add parent directory so we can import harness
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
