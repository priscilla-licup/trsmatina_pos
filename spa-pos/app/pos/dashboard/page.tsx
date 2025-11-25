// We’ll upgrade app/pos/dashboard/page.tsx so it:
// Says “Welcome, [username]”
// Shows today’s date
// Has some placeholder cards for:
// Today’s transactions
// Total sales
// Staff on duty
// Logs navigation automatically via the layout

// We’ll keep /pos/dashboard as the “home”, but:
// If admin → show full dashboard (stats + cards + payroll).
// If receptionist → show 3 big cards/buttons only (Transactions, Inventory, Attendance).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Boxes, Clock } from "lucide-react";


type MeResponse = {
  username: string;
  role: "admin" | "staff";
};

async function logAction(message: string, path: string) {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "action",
        message,
        path,
      }),
    });
  } catch {
    // ignore logging errors
  }
}

export default function PosDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = (await res.json()) as MeResponse;
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }

    fetchUser();
  }, []);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isAdmin = user?.role === "admin";

  // Quick “card click” handler with logging
  async function handleNavigate(path: string, label: string) {
    await logAction(`Clicked ${label} card`, path);
    router.push(path);
  }

  if (loadingUser) {
    return <p className="text-sm text-stone-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Thai Royale Spa Matina POS
          </p>
          <h1 className="text-3xl font-semibold text-stone-900">
            {user ? `Welcome, ${user.username}` : "Welcome"}
          </h1>
          <p className="text-base text-stone-500">{formattedDate}</p>
        </div>
      </header>

      {/* If staff: show only 3 big cards */}
      {!isAdmin && (
        <section className="grid gap-4 md:grid-cols-3">
          {/* TRANSACTIONS */}
          <Card
            className="flex cursor-pointer flex-col items-center justify-between border-stone-200 bg-white p-6 hover:bg-stone-50 text-center"
            onClick={() => handleNavigate("/pos/transactions", "Transactions")}
          >
            <div className="flex flex-col items-center">
              <Receipt className="h-12 w-12 text-stone-700 mb-3" />
              <h2 className="text-base font-semibold text-stone-800">
                Transactions
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Record sales & services.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-4 w-full text-sm"
            >
              Go to Transactions
            </Button>
          </Card>

          {/* INVENTORY */}
          <Card
            className="flex cursor-pointer flex-col items-center justify-between border-stone-200 bg-white p-6 hover:bg-stone-50 text-center"
            onClick={() => handleNavigate("/pos/inventory", "Inventory")}
          >
            <div className="flex flex-col items-center">
              <Boxes className="h-12 w-12 text-stone-700 mb-3" />
              <h2 className="text-base font-semibold text-stone-800">Inventory</h2>
              <p className="mt-1 text-sm text-stone-500">
                View stocks & supplies.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-4 w-full text-sm"
            >
              Go to Inventory
            </Button>
          </Card>

          {/* ATTENDANCE */}
          <Card
            className="flex cursor-pointer flex-col items-center justify-between border-stone-200 bg-white p-6 hover:bg-stone-50 text-center"
            onClick={() => handleNavigate("/pos/attendance", "Attendance")}
          >
            <div className="flex flex-col items-center">
              <Clock className="h-12 w-12 text-stone-700 mb-3" />
              <h2 className="text-base font-semibold text-stone-800">Attendance</h2>
              <p className="mt-1 text-sm text-stone-500">
                Time-in & time-out.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-4 w-full text-sm"
            >
              Go to Attendance
            </Button>
          </Card>
        </section>
      )}

      {/* If admin: show dashboard stats + nav cards including payroll */}
      {isAdmin && (
        <>
          {/* Stats cards */}
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-stone-200 bg-white p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
                Today&apos;s Transactions
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">0</p>
              <p className="mt-1 text-sm text-stone-500">
                Later: show number of walk-ins & bookings.
              </p>
            </Card>

            <Card className="border-stone-200 bg-white p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
                Today&apos;s Sales
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                ₱0.00
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Later: compute total from transactions.
              </p>
            </Card>

            <Card className="border-stone-200 bg-white p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
                Staff on Duty
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">0</p>
              <p className="mt-1 text-sm text-stone-500">
                Later: connect to attendance logs.
              </p>
            </Card>
          </section>

          {/* Quick navigation cards for admin */}
          <section className="grid gap-4 md:grid-cols-4">
            <Card
              className="flex cursor-pointer flex-col justify-between border-stone-200 bg-white p-4 hover:bg-stone-50"
              onClick={() =>
                handleNavigate("/pos/transactions", "Transactions")
              }
            >
              <h2 className="text-sm font-semibold text-stone-800">
                Transactions
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Manage services and payments.
              </p>
            </Card>

            <Card
              className="flex cursor-pointer flex-col justify-between border-stone-200 bg-white p-4 hover:bg-stone-50"
              onClick={() => handleNavigate("/pos/inventory", "Inventory")}
            >
              <h2 className="text-sm font-semibold text-stone-800">
                Inventory
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Adjust stock and monitor usage.
              </p>
            </Card>

            <Card
              className="flex cursor-pointer flex-col justify-between border-stone-200 bg-white p-4 hover:bg-stone-50"
              onClick={() => handleNavigate("/pos/attendance", "Attendance")}
            >
              <h2 className="text-sm font-semibold text-stone-800">
                Attendance
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Review time-in and time-out.
              </p>
            </Card>

            <Card
              className="flex cursor-pointer flex-col justify-between border-stone-200 bg-white p-4 hover:bg-stone-50"
              onClick={() => handleNavigate("/pos/payroll", "Payroll")}
            >
              <h2 className="text-sm font-semibold text-stone-800">
                Payroll
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Generate payslips and approve payouts.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
