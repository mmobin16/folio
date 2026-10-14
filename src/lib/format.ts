/** Stable timestamps for server-rendered labels. UTC avoids hydration mismatches. */
export function formatTimestamp(iso: string): string {
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;
}

export function roleLabel(role: "owner" | "edit" | "view"): string {
  if (role === "owner") return "Owner";
  if (role === "edit") return "Can edit";
  return "Can view";
}
