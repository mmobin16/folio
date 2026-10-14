"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { DocumentDetail, SharePermission, UserMatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { confirmFolio } from "@/components/ui/folio-dialogs";

type ShareDialogProps = {
  documentId: string;
  ownerName: string;
  ownerEmail: string;
  shares: DocumentDetail["shares"];
  canManage: boolean;
  open: boolean;
  onClose: () => void;
};

export function ShareDialog({
  documentId,
  ownerName,
  ownerEmail,
  shares,
  canManage,
  open,
  onClose,
}: ShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [people, setPeople] = useState(shares);
  const [email, setEmail] = useState("");
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [permission, setPermission] = useState<SharePermission>("edit");
  const searchTimer = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  function onEmail(value: string) {
    setEmail(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const query = value.trim();
      if (query.length < 1) {
        setMatches([]);
        return;
      }
      void api<{ users: UserMatch[] }>(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((result) => setMatches(result.users))
        .catch(() => setMatches([]));
    }, 250);
  }

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await api<{ document: DocumentDetail }>(`/api/documents/${documentId}/share`, {
        method: "PUT",
        body: JSON.stringify({ email, permission }),
      });
      setPeople(result.document.shares);
      setEmail("");
      setMatches([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    } finally {
      setPending(false);
    }
  }

  async function changePermission(userEmail: string, next: SharePermission) {
    setError(null);
    try {
      const result = await api<{ document: DocumentDetail }>(`/api/documents/${documentId}/share`, {
        method: "PUT",
        body: JSON.stringify({ email: userEmail, permission: next }),
      });
      setPeople(result.document.shares);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    }
  }

  async function revoke(userId: string, name: string) {
    const confirmed = await confirmFolio({
      title: "Remove access",
      message: `${name} will no longer be able to open this document.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    setError(null);
    try {
      const result = await api<{ document: DocumentDetail }>(
        `/api/documents/${documentId}/share/${userId}`,
        { method: "DELETE" },
      );
      setPeople(result.document.shares);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove access.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="folio-dialog w-[min(32rem,calc(100%-2rem))] rounded-lg border border-line bg-sheet p-0 text-ink"
      onClose={onClose}
    >
      <form className="p-5 sm:p-6" onSubmit={(event) => void grant(event)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Share</h2>
            <p className="mt-1 text-sm text-muted">
              Owners manage access. Editors can change the draft. Viewers can only read it.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-sm text-muted hover:bg-ink/5 hover:text-ink"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          <li className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">{ownerName}</p>
              <p className="text-sm text-muted">{ownerEmail}</p>
            </div>
            <span className="text-sm font-semibold">Owner</span>
          </li>
          {people.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{person.name}</p>
                <p className="truncate text-sm text-muted">{person.email}</p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Access for ${person.name}`}
                    className="rounded-md border border-line bg-sheet px-2 py-1 text-sm"
                    value={person.permission}
                    onChange={(event) =>
                      void changePermission(person.email, event.target.value as SharePermission)
                    }
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                  </select>
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger"
                    onClick={() => void revoke(person.userId, person.name)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-sm">{person.permission === "edit" ? "Can edit" : "Can view"}</span>
              )}
            </li>
          ))}
        </ul>

        {canManage ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="sr-only" htmlFor="share-email">
              Email
            </label>
            <div className="relative">
              <input
                id="share-email"
                type="text"
                autoComplete="off"
                required
                value={email}
                onChange={(event) => onEmail(event.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {matches.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-line bg-sheet shadow-lg">
                  {matches.map((match) => (
                    <li key={match.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                        onClick={() => {
                          setEmail(match.email);
                          setMatches([]);
                        }}
                      >
                        <span className="font-semibold">{match.name}</span>
                        <span className="mt-0.5 block text-muted">{match.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <select
              aria-label="Permission"
              value={permission}
              onChange={(event) => setPermission(event.target.value as SharePermission)}
              className="rounded-md border border-line bg-sheet px-2 py-2 text-sm"
            >
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Grant access"}
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Only the owner can change who has access.</p>
        )}

        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </dialog>
  );
}
