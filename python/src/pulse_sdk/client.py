"""Main Pulse SDK client."""

from __future__ import annotations

from typing import Optional, Union

from .http_client import HttpClient, AsyncHttpClient
from .metering import MeteringResource, AsyncMeteringResource


class Pulse:
    """Main entry point for the Pulse SDK (sync).

    Example::

        from pulse_sdk import Pulse

        pulse = Pulse("sk_live_...")

        # Track usage
        pulse.metering.track(
            meter_id="tokens",
            customer_id="user_123",
            value=1500,
        )

        # Session-based tracking
        session = pulse.metering.session("user_123")
        session.track("tokens", 500)
        session.track("requests", 1)
        session.end()

        # Query usage
        usage = pulse.metering.get_usage(customer_id="user_123")
        for item in usage.data:
            print(f"{item.meter_name}: {item.total_value} {item.unit}")
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: Optional[str] = None,
    ) -> None:
        self._client = HttpClient(api_key, base_url)
        self.metering = MeteringResource(self._client)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "Pulse":
        return self

    def __exit__(self, *args) -> None:
        self.close()


class AsyncPulse:
    """Async entry point for the Pulse SDK.

    Example::

        from pulse_sdk import AsyncPulse

        async with AsyncPulse("sk_live_...") as pulse:
            await pulse.metering.track(
                meter_id="tokens",
                customer_id="user_123",
                value=1500,
            )
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: Optional[str] = None,
    ) -> None:
        self._client = AsyncHttpClient(api_key, base_url)
        self.metering = AsyncMeteringResource(self._client)

    async def close(self) -> None:
        """Close the underlying async HTTP client."""
        await self._client.close()

    async def __aenter__(self) -> "AsyncPulse":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()
