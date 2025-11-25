"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MeResponse = {
  username: string;
  role: "admin" | "staff";
};

type InventoryItemStub = {
  _id: string;
  name: string;
  category?: string;
  quantityOnHand?: number;
};

export default function InventoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [items, setItems] = useState<InventoryItemStub[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse;
        setUser(data);
      } finally {
        setLoadingUser(false);
      }
    }

    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch("/api/inventory/items");
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.items || []);
      } finally {
        setLoadingItems(false);
      }
    }

    fetchUser();
    fetchItems();
  }, []);

  function goToDaily() {
    router.push("/pos/inventory/daily");
  }

  function goToReceive() {
    router.push("/pos/inventory/receive");
  }

  function handleNewItem() {
    // later: router.push("/pos/inventory/new");
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Inventory</h1>
          <p className="text-sm text-stone-500">
            View stock levels for spa supplies. Reception can log daily counts
            and received stock. Admin can add new items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={goToDaily}
          >
            Daily Inventory
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={goToReceive}
          >
            Receive Stock
          </Button>

          {/* New Item: visible to admin only */}
          {isAdmin && (
            <Button
              className="bg-stone-800 text-white hover:bg-stone-900 text-sm"
              onClick={handleNewItem}
            >
              New Item
            </Button>
          )}
        </div>
      </header>

      <Card className="border-stone-200 bg-white p-4">
        {loadingItems ? (
          <p className="text-sm text-stone-500">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">
            No items yet. (Admin needs to add initial items.)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Qty on Hand</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-stone-100 last:border-0"
                  >
                    <td className="py-2 pr-4">{item.name}</td>
                    <td className="py-2 pr-4 capitalize">
                      {item.category || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      {item.quantityOnHand ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
