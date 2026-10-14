"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-serif text-4xl tracking-tight">Folio hit a problem</h1>
      <p className="mt-3 text-muted">Refresh the page. If it keeps happening, the database may be unavailable.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sheet"
      >
        Try again
      </button>
    </main>
  );
}
