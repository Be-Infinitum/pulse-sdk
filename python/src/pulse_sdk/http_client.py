"""HTTP client for the Pulse API."""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .errors import (
    PulseApiError,
    PulseAuthenticationError,
    PulseCreditExhaustedError,
    PulseError,
    PulseRateLimitError,
)

DEFAULT_BASE_URL = "https://api.beinfi.com"


class HttpClient:
    """Low-level HTTP client that handles auth, errors, and envelope unwrapping."""

    def __init__(self, api_key: str, base_url: Optional[str] = None) -> None:
        if not api_key.startswith("sk_live_"):
            raise PulseError('Invalid API key format. Keys must start with "sk_live_"')

        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._client = httpx.Client(
            base_url=f"{self._base_url}/api/v1",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an HTTP request and return the parsed response."""
        # Filter out None params
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        response = self._client.request(
            method,
            path,
            json=json,
            params=params or None,
        )

        if not response.is_success:
            self._handle_error(response)

        if response.status_code == 204:
            return None

        data = response.json()

        # Unwrap { data: ... } envelope
        if isinstance(data, dict) and "data" in data:
            return data["data"]

        return data

    def _handle_error(self, response: httpx.Response) -> None:
        try:
            body = response.json()
        except Exception:
            body = {}

        error_code = body.get("error", "unknown_error")
        message = body.get("message", f"Request failed with status {response.status_code}")

        if response.status_code == 401:
            raise PulseAuthenticationError(message)

        if response.status_code == 402 and error_code == "credit_exhausted":
            raise PulseCreditExhaustedError(message)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise PulseRateLimitError(retry_after)

        raise PulseApiError(response.status_code, error_code, message)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


class AsyncHttpClient:
    """Async version of the HTTP client."""

    def __init__(self, api_key: str, base_url: Optional[str] = None) -> None:
        if not api_key.startswith("sk_live_"):
            raise PulseError('Invalid API key format. Keys must start with "sk_live_"')

        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=f"{self._base_url}/api/v1",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an async HTTP request and return the parsed response."""
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        response = await self._client.request(
            method,
            path,
            json=json,
            params=params or None,
        )

        if not response.is_success:
            self._handle_error(response)

        if response.status_code == 204:
            return None

        data = response.json()

        if isinstance(data, dict) and "data" in data:
            return data["data"]

        return data

    def _handle_error(self, response: httpx.Response) -> None:
        try:
            body = response.json()
        except Exception:
            body = {}

        error_code = body.get("error", "unknown_error")
        message = body.get("message", f"Request failed with status {response.status_code}")

        if response.status_code == 401:
            raise PulseAuthenticationError(message)

        if response.status_code == 402 and error_code == "credit_exhausted":
            raise PulseCreditExhaustedError(message)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise PulseRateLimitError(retry_after)

        raise PulseApiError(response.status_code, error_code, message)

    async def close(self) -> None:
        """Close the underlying async HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncHttpClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
