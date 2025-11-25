// We’ll make a layout for all POS pages that:
// Calls usePageLogger() once
// Wraps all POS pages in a consistent shell

// app/pos/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import { usePageLogger } from "@/hooks/usePageLogger";
import { Button } from "@/components/ui/button";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePageLogger();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-stone-200 bg-white px-5 py-8 md:flex md:flex-col md:justify-between">
          <div>
            <h2 className="mb-8 text-xl font-semibold">TRS Matina POS</h2>
            <nav className="space-y-3 text-sm">
              <a href="/pos/dashboard" className="block hover:text-stone-900">
                Dashboard
              </a>
              {/* Later: more nav links */}
            </nav>
          </div>
          <div className="pt-4 border-t border-stone-200">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}


