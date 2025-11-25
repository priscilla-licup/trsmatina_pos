// This screen is ideal for:

// Before opening:
// You (or reception) can select each item and input your initial quantity.
// Put reason: "Initial stock" so it’s obvious in history.

// During operations:
// Use it whenever new supplies arrive.

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InventoryItemDto = {
  _id: string;
  name: string;
  category?: string;
};

type ApiItemsResponse = {
  items: InventoryItemDto[];
};

async function logAction(message: string, path: string) {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "action", message, path }),
    });
  } catch {
    // ignore
  }
}

export default function InventoryReceivePage() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("Initial stock");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch("/api/inventory/items");
        if (!res.ok) throw new Error("Failed to load items");
        const data = (await res.json()) as ApiItemsResponse;
        setItems(data.items || []);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load items"
        );
      } finally {
        setLoadingItems(false);
      }
    }

    fetchItems();
  }, []);

  async function handleSubmit() {
    setSuccessMessage(null);
    setErrorMessage(null);

    const qtyNumber = Number(quantity);

    if (!selectedItemId) {
      setErrorMessage("Please choose an item.");
      return;
    }
    if (Number.isNaN(qtyNumber) || qtyNumber <= 0) {
      setErrorMessage("Please enter a valid quantity greater than 0.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItemId,
          quantity: qtyNumber,
          reason: reason || "Received stock",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record received stock.");
      }

      await logAction(
        `Received ${qtyNumber} units for item ${selectedItemId}`,
        "/pos/inventory/receive"
      );

      setSuccessMessage("Received stock recorded successfully.");
      setQuantity("");
      // keep selected item so they can log multiple deliveries easily
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to record received stock."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">
          Receive Stock
        </h1>
        <p className="text-sm text-stone-500">
          Use this when new supplies arrive (oils, towels, drinks, etc.), or to
          input your initial stock before opening.
        </p>
      </header>

      <Card className="border-stone-200 bg-white p-4 space-y-4">
        {loadingItems && (
          <p className="text-sm text-stone-500">Loading items...</p>
        )}

        {!loadingItems && items.length === 0 && (
          <p className="text-sm text-stone-500">
            No items found. Ask admin to create items in Inventory first.
          </p>
        )}

        {!loadingItems && items.length > 0 && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-800">
                Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                    {item.category ? ` (${item.category})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-800">
                Quantity received
              </label>
              <Input
                type="number"
                min={1}
                className="w-40 text-sm"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-800">
                Reason / Note
              </label>
              <Input
                type="text"
                className="text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Initial stock, delivery from supplier"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                This will increase the current stock and create a history log
                for this item.
              </p>
              <Button
                className="bg-stone-800 text-white hover:bg-stone-900 text-sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Received Stock"}
              </Button>
            </div>

            {successMessage && (
              <p className="mt-1 text-xs text-emerald-600">
                {successMessage}
              </p>
            )}
            {errorMessage && (
              <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
