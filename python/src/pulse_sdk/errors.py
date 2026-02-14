"""Error classes for the Pulse SDK."""

from __future__ import annotations

from typing import Optional


class PulseError(Exception):
    """Base error for all Pulse SDK errors."""

    pass


class PulseApiError(PulseError):
    """Raised when the API returns a non-2xx response."""

    def __init__(
        self,
        status: int,
        error_code: str,
        message: str,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.error_code = error_code


class PulseAuthenticationError(PulseApiError):
    """Raised on HTTP 401 (invalid/expired API key)."""

    def __init__(self, message: str = "Invalid API key") -> None:
        super().__init__(401, "unauthorized", message)


class PulseRateLimitError(PulseApiError):
    """Raised on HTTP 429 (rate limit exceeded)."""

    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(429, "rate_limit_exceeded", "Rate limit exceeded")
        self.retry_after = retry_after
