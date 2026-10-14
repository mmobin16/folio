"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 max-w-md space-y-4">
      <div>
        <label htmlFor="profile-name" className="text-sm font-semibold">
          Name
        </label>
        <input
          id="profile-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="profile-email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <p className="text-sm text-muted">
        Signed in as {user.email}. Your password stays on the account record and is not shown here.
      </p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-accent" role="status">
          Profile saved.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save profile"}
      </Button>
    </form>
  );
}
