"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { DEMO_PASSWORD, DEMO_USERS } from "@/server/demo-accounts";
import { Button } from "@/components/ui/button";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_USERS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(nextPath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-ink underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="grid gap-2 pt-2">
        {DEMO_USERS.map((account) => (
          <button
            key={account.email}
            type="button"
            className="rounded-md border border-line px-3 py-2 text-left text-sm hover:border-ink/30"
            onClick={() => {
              setEmail(account.email);
              setPassword(DEMO_PASSWORD);
              setError(null);
            }}
          >
            <span className="font-semibold">{account.name}</span>
            <span className="mt-0.5 block text-muted">{account.blurb}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
