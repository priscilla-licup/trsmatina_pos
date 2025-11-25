// This page:

// Pulls the current items from Mongo via /api/inventory/items
// Shows expected stock (quantityOnHand) and input for actual
// Sends only filled rows to /api/inventory/daily
// Logs the action via /api/log
// Is perfect for “log inventory every night”

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InventoryItemDto = {
  _id: string;
  name: string;
  category?: string;
  quantityOnHand?: number;
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
    // ignore logging errors
  }
}

export default function InventoryDailyPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loadingItems, setLoadingItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch items once on mount
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch("/api/inventory/items");
        if (!res.ok) {
          throw new Error("Failed to load items");
        }
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

  function handleCountChange(itemId: string, value: string) {
    setCounts((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  async function handleSubmit() {
    setSuccessMessage(null);
    setErrorMessage(null);

    // Build counts array only for items with a value
    const payloadCounts = items
      .map((item) => {
        const raw = counts[item._id];
        if (!raw || raw.trim() === "") return null;
        const parsed = Number(raw);
        if (Number.isNaN(parsed) || parsed < 0) return null;

        return {
          itemId: item._id,
          actualQty: parsed,
        };
      })
      .filter(Boolean) as { itemId: string; actualQty: number }[];

    if (payloadCounts.length === 0) {
      setErrorMessage("Please enter at least one actual count before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/inventory/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: payloadCounts }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit daily inventory.");
      }

      await logAction(
        `Submitted daily inventory for ${payloadCounts.length} items`,
        "/pos/inventory/daily"
      );

      setSuccessMessage("Daily inventory submitted successfully.");
      // Optional: clear the inputs
      setCounts({});
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to submit daily inventory."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">
          End-of-Day Inventory
        </h1>
        <p className="text-sm text-stone-500">
          At the end of the day, enter the actual count for key items (oils,
          towels, drinks, etc.). This helps track usage and discrepancies.
        </p>
      </header>

      <Card className="border-stone-200 bg-white p-4">
        {loadingItems && (
          <p className="text-sm text-stone-500">Loading items...</p>
        )}

        {!loadingItems && items.length === 0 && (
          <p className="text-sm text-stone-500">
            No items found. Ask admin to add items in Inventory first.
          </p>
        )}

        {!loadingItems && items.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 border-b border-stone-200 pb-2 text-xs font-semibold uppercase text-stone-500">
              <div>Item</div>
              <div className="text-right">Expected</div>
              <div className="text-right">Actual today</div>
            </div>

            {items.map((item) => (
              <div
                key={item._id}
                className="grid grid-cols-[2fr_1fr_1fr] items-center gap-3 border-b border-stone-100 py-2 last:border-0"
              >
                <div>
                  <p className="text-sm text-stone-900">{item.name}</p>
                  {item.category && (
                    <p className="text-xs capitalize text-stone-500">
                      {item.category}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-stone-700">
                  {item.quantityOnHand ?? 0}
                </div>
                <div className="flex justify-end">
                  <Input
                    type="number"
                    min={0}
                    className="w-24 text-right text-sm"
                    placeholder="0"
                    value={counts[item._id] ?? ""}
                    onChange={(e) =>
                      handleCountChange(item._id, e.target.value)
                    }
                  />
                </div>
              </div>
            ))}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                Only items with a value entered will be included in this
                submission.
              </p>
              <Button
                className="bg-stone-800 text-white hover:bg-stone-900 text-sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Daily Inventory"}
              </Button>
            </div>

            {successMessage && (
              <p className="mt-2 text-xs text-emerald-600">
                {successMessage}
              </p>
            )}
            {errorMessage && (
              <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
