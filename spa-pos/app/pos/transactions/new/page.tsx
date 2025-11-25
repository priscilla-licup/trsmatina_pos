"use client";

import { Card } from "@/components/ui/card";

export default function NewTransactionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">
        New Transaction
      </h1>
      <Card className="border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-500">
          Here you will select service, therapist, room, add-ons, and payment
          method. We can design this flow next.
        </p>
      </Card>
    </div>
  );
}
