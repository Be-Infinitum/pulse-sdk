"""Billing resource for subscriptions and invoices."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .http_client import HttpClient, AsyncHttpClient
from .types import Invoice, Subscription


class BillingResource:
    """Resource for billing operations: subscriptions and invoices.

    Example::

        pulse = Pulse("sk_live_...")

        # List subscriptions
        subs = pulse.billing.list_subscriptions("product-id")

        # Generate an invoice
        invoice = pulse.billing.generate_invoice(
            "product-id",
            customer_id="user_123",
            period_start="2026-01-01T00:00:00Z",
            period_end="2026-02-01T00:00:00Z",
        )
    """

    def __init__(self, client: HttpClient) -> None:
        self._client = client

    # ── Subscriptions ──────────────────────────────

    def list_subscriptions(
        self,
        product_id: str,
        *,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        """List subscriptions for a product.

        Args:
            product_id: The product UUID.
            status: Filter by status.
            limit: Max results.
            offset: Pagination offset.

        Returns:
            Dict with ``items`` (list of Subscription) and ``total``.
        """
        data = self._client.request(
            "GET",
            f"/billing/products/{product_id}/subscriptions",
            params={"status": status, "limit": limit, "offset": offset},
        )
        if isinstance(data, dict):
            data["items"] = [Subscription.from_dict(s) for s in data.get("items", [])]
        return data

    def get_subscription(
        self,
        product_id: str,
        subscription_id: str,
    ) -> Subscription:
        """Get a single subscription by ID."""
        data = self._client.request(
            "GET",
            f"/billing/products/{product_id}/subscriptions/{subscription_id}",
        )
        return Subscription.from_dict(data)

    def update_subscription(
        self,
        product_id: str,
        subscription_id: str,
        action: str,
    ) -> Subscription:
        """Update a subscription (pause, resume, or cancel).

        Args:
            product_id: The product UUID.
            subscription_id: The subscription UUID.
            action: One of ``pause``, ``resume``, ``cancel``.

        Returns:
            The updated subscription.
        """
        data = self._client.request(
            "PATCH",
            f"/billing/products/{product_id}/subscriptions/{subscription_id}",
            json={"action": action},
        )
        return Subscription.from_dict(data)

    # ── Invoices ───────────────────────────────────

    def list_invoices(self, product_id: str) -> List[Invoice]:
        """List invoices for a product."""
        data = self._client.request(
            "GET",
            f"/billing/products/{product_id}/invoices",
        )
        if isinstance(data, list):
            return [Invoice.from_dict(i) for i in data]
        return []

    def get_invoice(self, product_id: str, invoice_id: str) -> Invoice:
        """Get a single invoice by ID."""
        data = self._client.request(
            "GET",
            f"/billing/products/{product_id}/invoices/{invoice_id}",
        )
        return Invoice.from_dict(data)

    def generate_invoice(
        self,
        product_id: str,
        *,
        customer_id: str,
        period_start: str,
        period_end: str,
    ) -> Invoice:
        """Generate an invoice for a customer's usage during a period.

        Args:
            product_id: The product UUID.
            customer_id: The customer external ID.
            period_start: Start of billing period (ISO 8601).
            period_end: End of billing period (ISO 8601).

        Returns:
            The created invoice.
        """
        data = self._client.request(
            "POST",
            f"/billing/products/{product_id}/invoices",
            json={
                "customerId": customer_id,
                "periodStart": period_start,
                "periodEnd": period_end,
            },
        )
        return Invoice.from_dict(data)

    def send_invoice(
        self,
        product_id: str,
        invoice_id: str,
    ) -> Dict[str, Any]:
        """Send an invoice email to the customer.

        Returns:
            Dict with ``sent`` (bool) and ``invoiceId``.
        """
        return self._client.request(
            "POST",
            f"/billing/products/{product_id}/invoices/{invoice_id}/send",
        )


class AsyncBillingResource:
    """Async version of the billing resource."""

    def __init__(self, client: AsyncHttpClient) -> None:
        self._client = client

    # ── Subscriptions ──────────────────────────────

    async def list_subscriptions(
        self,
        product_id: str,
        *,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        """List subscriptions for a product (async)."""
        data = await self._client.request(
            "GET",
            f"/billing/products/{product_id}/subscriptions",
            params={"status": status, "limit": limit, "offset": offset},
        )
        if isinstance(data, dict):
            data["items"] = [Subscription.from_dict(s) for s in data.get("items", [])]
        return data

    async def get_subscription(
        self,
        product_id: str,
        subscription_id: str,
    ) -> Subscription:
        """Get a single subscription by ID (async)."""
        data = await self._client.request(
            "GET",
            f"/billing/products/{product_id}/subscriptions/{subscription_id}",
        )
        return Subscription.from_dict(data)

    async def update_subscription(
        self,
        product_id: str,
        subscription_id: str,
        action: str,
    ) -> Subscription:
        """Update a subscription (async)."""
        data = await self._client.request(
            "PATCH",
            f"/billing/products/{product_id}/subscriptions/{subscription_id}",
            json={"action": action},
        )
        return Subscription.from_dict(data)

    # ── Invoices ───────────────────────────────────

    async def list_invoices(self, product_id: str) -> List[Invoice]:
        """List invoices for a product (async)."""
        data = await self._client.request(
            "GET",
            f"/billing/products/{product_id}/invoices",
        )
        if isinstance(data, list):
            return [Invoice.from_dict(i) for i in data]
        return []

    async def get_invoice(self, product_id: str, invoice_id: str) -> Invoice:
        """Get a single invoice by ID (async)."""
        data = await self._client.request(
            "GET",
            f"/billing/products/{product_id}/invoices/{invoice_id}",
        )
        return Invoice.from_dict(data)

    async def generate_invoice(
        self,
        product_id: str,
        *,
        customer_id: str,
        period_start: str,
        period_end: str,
    ) -> Invoice:
        """Generate an invoice (async)."""
        data = await self._client.request(
            "POST",
            f"/billing/products/{product_id}/invoices",
            json={
                "customerId": customer_id,
                "periodStart": period_start,
                "periodEnd": period_end,
            },
        )
        return Invoice.from_dict(data)

    async def send_invoice(
        self,
        product_id: str,
        invoice_id: str,
    ) -> Dict[str, Any]:
        """Send an invoice email (async)."""
        return await self._client.request(
            "POST",
            f"/billing/products/{product_id}/invoices/{invoice_id}/send",
        )
