import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { DEMO_PASSWORD } from "@/server/demo-accounts";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/documents") || value.startsWith("//")) return "/documents";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/documents");

  const params = await searchParams;

  return (
    <main className="mx-auto grid min-h-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="font-serif text-4xl tracking-tight sm:text-6xl">Folio</p>
        <p className="mt-4 max-w-md text-lg text-muted">
          A shared writing desk for drafts that more than one person needs to touch.
        </p>
        <dl className="mt-8 max-w-md space-y-4 text-sm">
          <div>
            <dt className="font-semibold">Write</dt>
            <dd className="text-muted">Bold, italic, underline, headings, and lists. Drafts save themselves.</dd>
          </div>
          <div>
            <dt className="font-semibold">Import</dt>
            <dd className="text-muted">Bring in a .txt, .md, or .docx file as a new document.</dd>
          </div>
          <div>
            <dt className="font-semibold">Share</dt>
            <dd className="text-muted">The owner can grant view or edit access. Owned and shared drafts stay apart.</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border border-line bg-sheet p-6 shadow-[0_24px_48px_-32px_rgba(30,26,22,0.45)] sm:p-8">
        <h1 className="font-serif text-3xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Both demo accounts use the password <span className="font-semibold text-ink">{DEMO_PASSWORD}</span>.
        </p>
        <LoginForm nextPath={safeNext(params.next)} />
      </section>
    </main>
  );
}
