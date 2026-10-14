"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { PresenceView } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function editingLabel(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is editing`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are editing`;
}

export function PresenceBar({
  documentId,
  viewerId,
  activity,
  compact = false,
}: {
  documentId: string;
  viewerId: string;
  activity: "viewing" | "editing";
  compact?: boolean;
}) {
  const [people, setPeople] = useState<PresenceView[]>([]);

  useEffect(() => {
    let stopped = false;

    async function beat() {
      try {
        const result = await api<{ people: PresenceView[] }>(`/api/documents/${documentId}/presence`, {
          method: "POST",
          body: JSON.stringify({ activity }),
        });
        if (!stopped) setPeople(result.people);
      } catch {
        // Presence is a hint. Editing still works if this request fails.
      }
    }

    void beat();
    const timer = window.setInterval(() => void beat(), 8000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      void fetch(`/api/documents/${documentId}/presence`, { method: "DELETE", keepalive: true });
    };
  }, [activity, documentId]);

  const shown = compact ? people.filter((person) => person.userId !== viewerId) : people;
  const othersEditing = people
    .filter((person) => person.userId !== viewerId && person.activity === "editing")
    .map((person) => person.name);
  const label = editingLabel(othersEditing);

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      {shown.length > 0 ? (
        <div className="flex -space-x-1.5">
          {shown.map((person) => (
            <span
              key={person.userId}
              title={`${person.name} (${person.email}) is ${person.activity}`}
              className={`inline-flex items-center justify-center rounded-full border border-sheet font-semibold ${
                compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[10px]"
              } ${person.activity === "editing" ? "bg-accent text-white" : "bg-ink text-sheet"}`}
            >
              {initials(person.name)}
            </span>
          ))}
        </div>
      ) : null}
      <span className={compact ? "hidden text-xs text-muted xl:inline" : "text-xs text-muted"}>
        {label ?? (people.length > 1 ? `${people.length} viewing` : "Only you")}
      </span>
    </div>
  );
}
