/**
 * Today's date in the user's own time zone, as YYYY-MM-DD (the format
 * <input type="date"> uses). Not toISOString(): that is UTC, which is
 * still yesterday in India until 5:30 am.
 */
export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True for a real calendar date written as YYYY-MM-DD: "2026-03-15" yes, "2026-02-30" no. */
export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  // An impossible day rolls over ("2026-02-30" becomes 2 March), so it won't read back the same.
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

const displayDateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  // new Date("2026-03-15") is midnight UTC, so format it in UTC as well;
  // otherwise users west of UTC would see 14 Mar.
  timeZone: 'UTC',
});

/** "2026-03-15" → "15 Mar 2026". Unreadable dates are shown as they are. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : displayDateFormat.format(date);
}
