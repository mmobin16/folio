import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/documents");

  return (
    <main className="mx-auto grid min-h-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="font-serif text-4xl tracking-tight sm:text-6xl">Folio</p>
        <p className="mt-4 max-w-md text-lg text-muted">
          Create an account to own drafts and to receive documents other people share with you.
        </p>
      </section>
      <section className="rounded-lg border border-line bg-sheet p-6 shadow-[0_24px_48px_-32px_rgba(30,26,22,0.45)] sm:p-8">
        <h1 className="font-serif text-3xl tracking-tight">Create an account</h1>
        <p className="mt-2 text-sm text-muted">Use at least 8 characters. You can change your name and email later.</p>
        <RegisterForm />
      </section>
    </main>
  );
}
