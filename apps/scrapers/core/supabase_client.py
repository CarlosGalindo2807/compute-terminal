"""Lazy-singleton Supabase client (service role)."""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from core.settings import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
