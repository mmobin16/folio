import Link from "next/link";
import { LogoutButton } from "@/components/shell/logout-button";

export function AppHeader({ name, email, className = "" }: { name: string; email: string; className?: string }) {
  return (
    <header className={`sticky top-0 z-20 border-b border-line bg-sheet/95 backdrop-blur-sm ${className}`}>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/documents" className="font-serif text-[1.7rem] leading-none tracking-tight text-ink">
          Folio
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/account" className="min-w-0 text-right">
            <span className="block max-w-40 truncate text-sm font-semibold sm:max-w-none">{name}</span>
            <span className="hidden max-w-56 truncate text-xs text-muted md:block">{email}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
