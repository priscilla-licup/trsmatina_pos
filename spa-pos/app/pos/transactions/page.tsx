"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Types must match your API/model
type ServiceStatus = "ongoing" | "done" | "cancelled";
type PaymentStatus = "unpaid" | "paid" | "complimentary";

type TransactionService = {
  serviceName: string;
  durationMinutes?: number;
  amount: number;
};

type Transaction = {
  _id: string;
  businessDateKey: string;
  startedAt: string;
  guestName?: string;
  services: TransactionService[];
  totalAmount: number;
  therapistName?: string;
  roomName?: string;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: "cash" | "gcash" | "card" | "other";
  notes?: string;
};

type Scope = "active" | "today";

// TEMP: hardcoded service list for your spa.
// Later you can move this to a Service master table or Mongo collection.
const SERVICE_OPTIONS = [
  {
    id: "thai60",
    name: "Thai Massage – 60 min",
    durationMinutes: 60,
    amount: 600,
  },
  {
    id: "thai90",
    name: "Thai Massage – 90 min",
    durationMinutes: 90,
    amount: 900,
  },
  {
    id: "swedish60",
    name: "Swedish – 60 min",
    durationMinutes: 60,
    amount: 650,
  },
  {
    id: "foot60",
    name: "Foot Massage – 60 min",
    durationMinutes: 60,
    amount: 500,
  },
];

async function logAction(message: string, path: string, meta?: unknown) {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "action", message, path, meta }),
    });
  } catch {
    // ignore logging errors
  }
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const label =
    status === "ongoing"
      ? "Ongoing"
      : status === "done"
      ? "Done"
      : "Cancelled";
  const colorClass =
    status === "ongoing"
      ? "bg-amber-100 text-amber-800"
      : status === "done"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-red-100 text-red-800";

  return (
    <Badge className={`border-0 px-2 py-0.5 text-xs ${colorClass}`}>
      {label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const label =
    status === "unpaid"
      ? "Unpaid"
      : status === "paid"
      ? "Paid"
      : "Complimentary";

  const colorClass =
    status === "unpaid"
      ? "bg-red-50 text-red-700"
      : status === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-indigo-50 text-indigo-700";

  return (
    <Badge className={`border-0 px-2 py-0.5 text-xs ${colorClass}`}>
      {label}
    </Badge>
  );
}

export default function TransactionsPage() {
  const [scope, setScope] = useState<Scope>("active");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW TRANSACTION dialog state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [therapistName, setTherapistName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);

  const selectedService = useMemo(
    () => SERVICE_OPTIONS.find((s) => s.id === selectedServiceId) || null,
    [selectedServiceId]
  );

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/transactions?scope=${scope}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load transactions");
        }

        setTransactions(data.transactions || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transactions"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, [scope]);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch(`/api/transactions?scope=${scope}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTransaction() {
    if (!selectedService) {
      setError("Please select a massage type.");
      return;
    }

    try {
      setSubmittingNew(true);
      setError(null);

      const body = {
        guestName: guestName.trim() || undefined,
        services: [
          {
            serviceName: selectedService.name,
            durationMinutes: selectedService.durationMinutes,
            amount: selectedService.amount,
          },
        ],
        therapistName: therapistName.trim() || undefined,
        roomName: roomName.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create transaction");
      }

      await logAction("Created new transaction", "/pos/transactions", {
        transactionId: data.transaction?._id,
      });

      // Reset form & close dialog
      setGuestName("");
      setTherapistName("");
      setRoomName("");
      setNotes("");
      setSelectedServiceId("");
      setIsNewOpen(false);

      // Refresh list
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transaction"
      );
    } finally {
      setSubmittingNew(false);
    }
  }

  async function updateTransaction(
    id: string,
    updates: Partial<{
      serviceStatus: ServiceStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: "cash" | "gcash" | "card" | "other";
    }>
  ) {
    try {
      setError(null);

      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update transaction");
      }

      await logAction("Updated transaction", "/pos/transactions", {
        transactionId: id,
        updates,
      });

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update transaction"
      );
    }
  }

  async function handleMarkDone(id: string) {
    await updateTransaction(id, { serviceStatus: "done" });
  }

  async function handleMarkPaid(id: string) {
    // For now: default payment method to cash.
    // Later: you can show a dialog to choose payment method.
    await updateTransaction(id, {
      paymentStatus: "paid",
      paymentMethod: "cash",
    });
  }

  const title =
    scope === "active"
      ? "Active Massages & Unpaid Transactions"
      : "All Transactions Today";

  return (
    <div className="space-y-4">
      {/* Header + scope toggles */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Transactions
          </h1>
          <p className="text-sm text-stone-500">
            Track ongoing massages and payments for Thai Royale Spa Matina.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-stone-200 bg-white p-1 text-xs">
            <button
              className={`rounded-full px-3 py-1 ${
                scope === "active"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
              onClick={() => setScope("active")}
            >
              Active
            </button>
            <button
              className={`rounded-full px-3 py-1 ${
                scope === "today"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
              onClick={() => setScope("today")}
            >
              Today
            </button>
          </div>

          <Button
            className="bg-stone-800 text-white hover:bg-stone-900 text-sm"
            onClick={() => setIsNewOpen(true)}
          >
            New Transaction
          </Button>
        </div>
      </header>

      {/* Table */}
      <Card className="border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={refresh}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-stone-500">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-stone-500">
            No transactions found for this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Guest</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Therapist</th>
                  <th className="py-2 pr-4">Room</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const serviceSummary =
                    tx.services.length === 1
                      ? tx.services[0].serviceName
                      : `${tx.services[0].serviceName} + ${
                          tx.services.length - 1
                        } more`;

                  return (
                    <tr
                      key={tx._id}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="py-2 pr-4 text-xs text-stone-700">
                        {formatTime(tx.startedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <p className="text-sm text-stone-900">
                          {tx.guestName || "Walk-in"}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-sm text-stone-800">
                        {serviceSummary}
                      </td>
                      <td className="py-2 pr-4 text-sm text-stone-800">
                        {tx.therapistName || "-"}
                      </td>
                      <td className="py-2 pr-4 text-sm text-stone-800">
                        {tx.roomName || "-"}
                      </td>
                      <td className="py-2 pr-4 text-right text-sm font-semibold text-stone-900">
                        ₱{tx.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4">
                        <ServiceStatusBadge status={tx.serviceStatus} />
                      </td>
                      <td className="py-2 pr-4">
                        <PaymentStatusBadge status={tx.paymentStatus} />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {tx.serviceStatus !== "done" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px]"
                              onClick={() => handleMarkDone(tx._id)}
                            >
                              Mark Done
                            </Button>
                          )}
                          {tx.paymentStatus !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px]"
                              onClick={() => handleMarkPaid(tx._id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600">
            {error}
          </p>
        )}
      </Card>

      {/* NEW TRANSACTION DIALOG */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Add a new massage session. Amount is automatically based on the
              selected service.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 grid gap-3 md:grid-cols-[1.6fr_1.4fr]">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-800">
                  Guest name (optional)
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Walk-in / leave blank"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-800">
                  Massage type
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="">Select service</option>
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} – ₱{s.amount}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-800">
                  Therapist
                </label>
                <Input
                  value={therapistName}
                  onChange={(e) => setTherapistName(e.target.value)}
                  placeholder="e.g. Anna"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-800">
                  Room (optional)
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. VIP Room"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-800">
                  Notes (optional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VIP guest, back pain, etc."
                  className="text-sm"
                />
              </div>
            </div>

            {/* Summary Card */}
            <Card className="border-stone-200 bg-stone-50 p-3 text-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase text-stone-500">
                Summary
              </h3>
              <p className="text-xs text-stone-500">Service</p>
              <p className="text-sm font-medium text-stone-900">
                {selectedService
                  ? selectedService.name
                  : "No service selected"}
              </p>
              {selectedService && selectedService.durationMinutes && (
                <p className="text-xs text-stone-600">
                  Duration: {selectedService.durationMinutes} mins
                </p>
              )}

              <div className="mt-3 border-t border-stone-200 pt-2">
                <p className="text-xs text-stone-500">Therapist</p>
                <p className="text-sm text-stone-900">
                  {therapistName || "-"}
                </p>
              </div>

              <div className="mt-3 border-t border-stone-200 pt-2">
                <p className="text-xs text-stone-500">Estimated amount</p>
                <p className="text-lg font-semibold text-stone-900">
                  ₱
                  {selectedService
                    ? selectedService.amount.toFixed(2)
                    : "0.00"}
                </p>
              </div>
            </Card>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between gap-2">
            <p className="text-[11px] text-stone-500">
              This will create a new transaction for the current business day.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-stone-800 text-white hover:bg-stone-900"
                onClick={handleCreateTransaction}
                disabled={submittingNew}
              >
                {submittingNew ? "Saving..." : "Save Transaction"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
