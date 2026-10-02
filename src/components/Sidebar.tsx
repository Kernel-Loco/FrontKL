"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getNavigation } from "@/config/permissions";
import type { Role } from "@/types";
import { Logo } from "./Logo";

export const MOBILE_NAV_ID = "mobile-navigation";

function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate} className="rounded-md" aria-label="Cirdan, ir al resumen">
          <Logo size="md" />
        </Link>
      </div>
      <nav aria-label="Navegación principal" className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {getNavigation(role).map(({ id, label, href, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-cirdan-700 text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="relative z-10 px-5 pb-5 text-xs text-white/50">Entorno de demostración · datos simulados</p>
      {/* Eco de los anillos del login. */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-24 -left-24 w-72 opacity-40">
        <circle cx="100" cy="100" r="100" className="fill-cirdan-700" />
        <circle cx="100" cy="100" r="76" className="fill-cirdan-800" />
        <circle cx="100" cy="100" r="56" className="fill-cirdan-950" />
      </svg>
    </>
  );
}

interface SidebarProps {
  role: Role;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ role, mobileOpen, onMobileClose }: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden bg-cirdan-950 [--focus-ring:#fff] md:flex">
        <SidebarContent role={role} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-slate-900/50" onClick={onMobileClose} />
          <aside
            id={MOBILE_NAV_ID}
            aria-label="Menú"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-cirdan-950 shadow-xl [--focus-ring:#fff]"
          >
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Cerrar menú"
              autoFocus
              className="absolute right-3 top-4 z-20 rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <SidebarContent role={role} onNavigate={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
