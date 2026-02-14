"""Type definitions for the Pulse SDK."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class TrackEventParams:
    """Parameters for tracking a usage event."""

    meter_id: str
    customer_id: str
    value: float | int | str
    event_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class TrackEventResponse:
    """A tracked event as returned by the API."""

    id: str
    event_id: str
    meter_id: str
    customer_id: str
    value: str
    timestamp: str
    created_at: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrackEventResponse":
        return cls(
            id=data["id"],
            event_id=data["eventId"],
            meter_id=data["meterId"],
            customer_id=data["customerId"],
            value=data["value"],
            timestamp=data["timestamp"],
            created_at=data["createdAt"],
        )


@dataclass
class BatchTrackResponse:
    """Result of a batch track operation."""

    accepted: int
    failed: int
    results: List[TrackEventResponse]
    errors: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BatchTrackResponse":
        return cls(
            accepted=data["accepted"],
            failed=data["failed"],
            results=[TrackEventResponse.from_dict(r) for r in data.get("results", [])],
            errors=data.get("errors"),
        )


@dataclass
class UsageQuery:
    """Query parameters for aggregated usage."""

    customer_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@dataclass
class UsageItem:
    """A single meter's aggregated usage."""

    meter_id: str
    meter_name: str
    unit: str
    unit_price: str
    total_value: str
    total_amount: str
    event_count: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UsageItem":
        return cls(
            meter_id=data["meterId"],
            meter_name=data["meterName"],
            unit=data["unit"],
            unit_price=data["unitPrice"],
            total_value=data["totalValue"],
            total_amount=data["totalAmount"],
            event_count=data["eventCount"],
        )


@dataclass
class UsageResponse:
    """Aggregated usage response."""

    data: List[UsageItem]

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "UsageResponse":
        return cls(data=[UsageItem.from_dict(item) for item in raw.get("data", [])])


@dataclass
class CreateCustomerParams:
    """Parameters for creating a customer."""

    external_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class MeteringProduct:
    """A product with meters."""

    id: str
    name: str
    status: str
    description: Optional[str] = None
    meters: List[Dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MeteringProduct":
        return cls(
            id=data["id"],
            name=data["name"],
            status=data["status"],
            description=data.get("description"),
            meters=data.get("meters", []),
        )


@dataclass
class ProductCustomer:
    """A customer linked to a product."""

    id: str
    external_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProductCustomer":
        return cls(
            id=data["id"],
            external_id=data["externalId"],
            name=data.get("name"),
            email=data.get("email"),
            created_at=data.get("createdAt"),
        )
