"use client";

import { useCallback, useState } from "react";
import { Menu } from "lucide-react";
import type { User } from "@/types";
import { IdleTimeout } from "../IdleTimeout";
import { Logo } from "../Logo";
import { MOBILE_NAV_ID, Sidebar, type NavBadges } from "../Sidebar";

interface DashboardShellProps {
  user: User;
  badges: NavBadges;
  children: React.ReactNode;
}

export function DashboardShell({ user, badges, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="lt-dark min-h-dvh bg-lt-bg text-lt-text md:flex">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-lt-surface px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Sidebar user={user} badges={badges} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-lt-border bg-lt-bg/95 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls={MOBILE_NAV_ID}
            className="rounded-md p-2 text-lt-muted hover:bg-white/5 hover:text-white"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Logo />
        </header>
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-10">
          {children}
        </main>
      </div>
      <IdleTimeout />
    </div>
  );
}
