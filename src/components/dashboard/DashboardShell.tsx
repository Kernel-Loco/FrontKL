"use client";

import { useCallback, useState } from "react";
import type { User } from "@/types";
import { Header } from "../Header";
import { IdleTimeout } from "../IdleTimeout";
import { Sidebar } from "../Sidebar";

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 md:flex">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-cirdan-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Sidebar role={user.role} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} menuOpen={menuOpen} onMenuClick={() => setMenuOpen(true)} />
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <IdleTimeout />
    </div>
  );
}
