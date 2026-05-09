"""Pytest config: stub Supabase env so importing the providers doesn't blow up."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Add scrapers root to path so `from core...` works without install.
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
