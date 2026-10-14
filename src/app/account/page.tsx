import { AppHeader } from "@/components/shell/app-header";
import { ProfileForm } from "@/components/account/profile-form";
import { requirePageUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requirePageUser();

  return (
    <>
      <AppHeader name={user.name} email={user.email} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Account</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight">Your profile</h1>
        <ProfileForm user={user} />
      </main>
    </>
  );
}
