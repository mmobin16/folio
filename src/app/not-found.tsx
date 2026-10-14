import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="font-serif text-3xl tracking-tight">Folio</p>
      <h1 className="mt-6 font-serif text-4xl tracking-tight">That page is not here</h1>
      <p className="mt-3 text-muted">The document may have been deleted, or the link is wrong.</p>
      <Link href="/documents" className="mt-6 inline-block font-semibold text-accent">
        Back to documents
      </Link>
    </main>
  );
}
