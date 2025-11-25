// We’ll use a React hook that sends a log to /api/log every time 
// the pathname changes.

// hooks/usePageLogger.ts
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function usePageLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Only care about POS routes
    if (!pathname.startsWith("/pos")) return;

    // Define which paths we actually want to log
    const importantPaths = [
      "/pos/dashboard",
      "/pos/transactions",
      "/pos/attendance",
      "/pos/inventory",
      "/pos/payroll",
    ];

    // If it's not in the important list, skip logging
    if (!importantPaths.includes(pathname)) return;

    // Fire and forget – don't block UI
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "navigation",
        message: `Visited ${pathname}`,
        path: pathname,
      }),
    }).catch(() => {
      // Ignore logging errors
    });
  }, [pathname]);
}
