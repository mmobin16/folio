"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-ink/5 hover:text-ink disabled:opacity-50"
    >
      {pending ? "Signing out" : "Sign out"}
    </button>
  );
}
