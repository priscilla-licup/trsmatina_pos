// lib/businessDate.ts

// cutoffHour = hour where your "business day" resets (e.g. 4 = 4:00 am)
export function getBusinessDateKey(date = new Date(), cutoffHour = 4): string {
  const d = new Date(date);

  const hour = d.getHours();
  if (hour < cutoffHour) {
    // Before cutoff → treat as previous calendar day
    d.setDate(d.getDate() - 1);
  }

  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`; // e.g. "2025-11-25"
}
