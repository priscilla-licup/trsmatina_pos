"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MeResponse = {
  username: string;
  role: "admin" | "staff";
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

export default function AttendancePage() {
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

  async function handleTimeIn() {
    await logAction("Clicked Time In", "/pos/attendance");
    // Later: call /api/attendance/time-in
  }

  async function handleTimeOut() {
    await logAction("Clicked Time Out", "/pos/attendance");
    // Later: call /api/attendance/time-out
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Attendance</h1>
        <p className="text-sm text-stone-500">
          Time-in and time-out for staff and therapists.
        </p>
      </header>

      <Card className="border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-700">
          {loadingUser
            ? "Loading user..."
            : user
            ? `Logged in as: ${user.username} (${user.role})`
            : "User not found"}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            className="bg-stone-800 text-white hover:bg-stone-900 text-sm"
            onClick={handleTimeIn}
          >
            Time In
          </Button>
          <Button
            variant="outline"
            className="text-sm"
            onClick={handleTimeOut}
          >
            Time Out
          </Button>
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Later: show today&apos;s time-in/out records here for this staff,
          plus admin view to see all staff.
        </p>
      </Card>
    </div>
  );
}
