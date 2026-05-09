"""Core scraper machinery shared across providers."""

# Use the OS certificate store (Windows / macOS keychain) so corporate proxies
# with their own root CA work without per-machine SSL_CERT_FILE config.
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

from core.base_scraper import BaseScraper, ScrapedListing
from core.event_publisher import publish_event
from core.normalizer import normalize_gpu_string
from core.settings import settings
from core.supabase_client import get_supabase

__all__ = [
    "BaseScraper",
    "ScrapedListing",
    "get_supabase",
    "normalize_gpu_string",
    "publish_event",
    "settings",
]
