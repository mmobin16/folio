import Link from "next/link";
import { LogoutButton } from "@/components/shell/logout-button";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-sheet/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/documents" className="font-serif text-[1.7rem] leading-none tracking-tight text-ink">
          Folio
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="max-w-40 truncate text-sm text-muted sm:max-w-none">{name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
