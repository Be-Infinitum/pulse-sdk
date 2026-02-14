"""Metering resource for tracking usage events and querying aggregated data."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Union

from .http_client import HttpClient, AsyncHttpClient
from .types import (
    BatchTrackResponse,
    CreateCustomerParams,
    MeteringProduct,
    ProductCustomer,
    TrackEventParams,
    TrackEventResponse,
    UsageQuery,
    UsageResponse,
)


class MeteringResource:
    """Resource for usage-based metering.

    Example::

        pulse = Pulse("sk_live_...")

        # Track a single event
        pulse.metering.track(meter_id="tokens", customer_id="user_123", value=1500)

        # Track with a session (batch)
        session = pulse.metering.session("user_123")
        session.track("tokens", 500)
        session.track("tokens", 300)
        session.end()  # sends as batch
    """

    def __init__(self, client: HttpClient) -> None:
        self._client = client

    def track(
        self,
        *,
        meter_id: str,
        customer_id: str,
        value: Union[int, float, str],
        event_id: Optional[str] = None,
        timestamp: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TrackEventResponse:
        """Track a single usage event.

        Args:
            meter_id: Meter ID or slug to track against.
            customer_id: Your customer's identifier.
            value: Quantity consumed.
            event_id: Idempotency key. Auto-generated if not provided.
            timestamp: ISO 8601 timestamp. Defaults to now.
            metadata: Additional metadata.

        Returns:
            The created event.
        """
        body = {
            "eventId": event_id or str(uuid.uuid4()),
            "meterId": meter_id,
            "customerId": customer_id,
            "value": str(value),
        }
        if timestamp:
            body["timestamp"] = timestamp
        if metadata:
            body["metadata"] = metadata

        data = self._client.request("POST", "/metering/events", json=body)
        return TrackEventResponse.from_dict(data)

    def track_batch(self, events: List[TrackEventParams]) -> BatchTrackResponse:
        """Track multiple usage events in a single request.

        Args:
            events: List of TrackEventParams.

        Returns:
            Batch result with accepted/failed counts.
        """
        payload = {
            "events": [
                {
                    "eventId": e.event_id or str(uuid.uuid4()),
                    "meterId": e.meter_id,
                    "customerId": e.customer_id,
                    "value": str(e.value),
                    **({"timestamp": e.timestamp.isoformat()} if e.timestamp else {}),
                    **({"metadata": e.metadata} if e.metadata else {}),
                }
                for e in events
            ]
        }
        data = self._client.request("POST", "/metering/events/batch", json=payload)
        return BatchTrackResponse.from_dict(data)

    def get_usage(
        self,
        *,
        customer_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> UsageResponse:
        """Query aggregated usage data.

        Args:
            customer_id: Filter by customer.
            start_date: Start of period (ISO date string).
            end_date: End of period (ISO date string).

        Returns:
            Aggregated usage by meter.
        """
        data = self._client.request(
            "GET",
            "/metering/usage",
            params={
                "customerId": customer_id,
                "startDate": start_date,
                "endDate": end_date,
            },
        )
        return UsageResponse.from_dict(data if isinstance(data, dict) else {"data": data})

    def list_products(self) -> List[MeteringProduct]:
        """List all products."""
        data = self._client.request("GET", "/metering/products")
        if isinstance(data, list):
            return [MeteringProduct.from_dict(p) for p in data]
        return []

    def create_customer(
        self,
        product_id: str,
        *,
        external_id: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProductCustomer:
        """Create a customer for a product.

        Args:
            product_id: The product UUID.
            external_id: Your identifier for this customer.
            name: Customer name.
            email: Customer email.
            metadata: Additional metadata.

        Returns:
            The created customer.
        """
        body: Dict[str, Any] = {"externalId": external_id}
        if name:
            body["name"] = name
        if email:
            body["email"] = email
        if metadata:
            body["metadata"] = metadata

        data = self._client.request(
            "POST",
            f"/metering/products/{product_id}/customers",
            json=body,
        )
        return ProductCustomer.from_dict(data)

    def session(self, customer_id: str) -> "MeteringSession":
        """Create a session for batch tracking.

        Events are accumulated and sent as a batch when ``.end()`` is called.

        Args:
            customer_id: The customer external ID.

        Returns:
            A MeteringSession instance.
        """
        return MeteringSession(self, customer_id)


class MeteringSession:
    """Accumulates track calls and sends them as a batch.

    Example::

        session = pulse.metering.session("user_123")
        session.track("tokens", 500)
        session.track("requests", 1)
        result = session.end()
    """

    def __init__(self, metering: MeteringResource, customer_id: str) -> None:
        self._metering = metering
        self._customer_id = customer_id
        self._events: List[TrackEventParams] = []

    def track(
        self,
        meter_id: str,
        value: Union[int, float, str],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "MeteringSession":
        """Queue a tracking event in this session."""
        self._events.append(
            TrackEventParams(
                meter_id=meter_id,
                customer_id=self._customer_id,
                value=value,
                metadata=metadata,
            )
        )
        return self

    def end(self) -> BatchTrackResponse:
        """Send all accumulated events as a batch and clear the session."""
        if not self._events:
            return BatchTrackResponse(accepted=0, failed=0, results=[])
        result = self._metering.track_batch(self._events)
        self._events = []
        return result


class AsyncMeteringResource:
    """Async version of the metering resource.

    Example::

        pulse = AsyncPulse("sk_live_...")
        await pulse.metering.track(meter_id="tokens", customer_id="user_123", value=1500)
    """

    def __init__(self, client: AsyncHttpClient) -> None:
        self._client = client

    async def track(
        self,
        *,
        meter_id: str,
        customer_id: str,
        value: Union[int, float, str],
        event_id: Optional[str] = None,
        timestamp: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TrackEventResponse:
        """Track a single usage event (async)."""
        body = {
            "eventId": event_id or str(uuid.uuid4()),
            "meterId": meter_id,
            "customerId": customer_id,
            "value": str(value),
        }
        if timestamp:
            body["timestamp"] = timestamp
        if metadata:
            body["metadata"] = metadata

        data = await self._client.request("POST", "/metering/events", json=body)
        return TrackEventResponse.from_dict(data)

    async def track_batch(self, events: List[TrackEventParams]) -> BatchTrackResponse:
        """Track multiple events in a single request (async)."""
        payload = {
            "events": [
                {
                    "eventId": e.event_id or str(uuid.uuid4()),
                    "meterId": e.meter_id,
                    "customerId": e.customer_id,
                    "value": str(e.value),
                    **({"timestamp": e.timestamp.isoformat()} if e.timestamp else {}),
                    **({"metadata": e.metadata} if e.metadata else {}),
                }
                for e in events
            ]
        }
        data = await self._client.request("POST", "/metering/events/batch", json=payload)
        return BatchTrackResponse.from_dict(data)

    async def get_usage(
        self,
        *,
        customer_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> UsageResponse:
        """Query aggregated usage (async)."""
        data = await self._client.request(
            "GET",
            "/metering/usage",
            params={
                "customerId": customer_id,
                "startDate": start_date,
                "endDate": end_date,
            },
        )
        return UsageResponse.from_dict(data if isinstance(data, dict) else {"data": data})

    async def list_products(self) -> List[MeteringProduct]:
        """List all products (async)."""
        data = await self._client.request("GET", "/metering/products")
        if isinstance(data, list):
            return [MeteringProduct.from_dict(p) for p in data]
        return []

    async def create_customer(
        self,
        product_id: str,
        *,
        external_id: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProductCustomer:
        """Create a customer for a product (async)."""
        body: Dict[str, Any] = {"externalId": external_id}
        if name:
            body["name"] = name
        if email:
            body["email"] = email
        if metadata:
            body["metadata"] = metadata

        data = await self._client.request(
            "POST",
            f"/metering/products/{product_id}/customers",
            json=body,
        )
        return ProductCustomer.from_dict(data)

    def session(self, customer_id: str) -> "AsyncMeteringSession":
        """Create an async session for batch tracking."""
        return AsyncMeteringSession(self, customer_id)


class AsyncMeteringSession:
    """Async version of MeteringSession."""

    def __init__(self, metering: AsyncMeteringResource, customer_id: str) -> None:
        self._metering = metering
        self._customer_id = customer_id
        self._events: List[TrackEventParams] = []

    def track(
        self,
        meter_id: str,
        value: Union[int, float, str],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "AsyncMeteringSession":
        """Queue a tracking event in this session."""
        self._events.append(
            TrackEventParams(
                meter_id=meter_id,
                customer_id=self._customer_id,
                value=value,
                metadata=metadata,
            )
        )
        return self

    async def end(self) -> BatchTrackResponse:
        """Send all accumulated events as a batch (async)."""
        if not self._events:
            return BatchTrackResponse(accepted=0, failed=0, results=[])
        result = await self._metering.track_batch(self._events)
        self._events = []
        return result
