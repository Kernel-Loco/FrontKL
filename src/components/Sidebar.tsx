"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { getNavigation, isNavItemActive, ROLE_LABELS, type SectionId } from "@/config/permissions";
import { logout } from "@/services/authService";
import type { User } from "@/types";
import { ThemeToggle, type ThemeMode } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Spinner } from "./Spinner";

export const MOBILE_NAV_ID = "mobile-navigation";

/** Números junto a una sección, como los dominios que necesitan atención. */
export type NavBadges = Partial<Record<SectionId, number>>;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function SidebarContent({ user, badges, theme, onThemeToggle, onNavigate }: { user: User; badges: NavBadges; theme: ThemeMode; onThemeToggle: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace("/login?notice=logout");
    router.refresh();
  };

  return (
    <>
      <div className="flex h-20 shrink-0 items-center px-6">
        <Link href="/dashboard" onClick={onNavigate} className="rounded-md" aria-label="Lowtide, ir al dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 space-y-7 overflow-y-auto px-3 py-2">
        {getNavigation(user.role).map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-lt-faint">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(item, pathname, user.role);
                const count = badges[item.id];
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-lt-nav font-semibold text-lt-text" : "text-lt-muted hover:bg-lt-raised hover:text-lt-text"
                      }`}
                    >
                      <span className="relative shrink-0">
                        <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${active ? "text-lt-indigo-soft" : ""}`} strokeWidth={1.75} />
                        {count ? (
                          <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lt-amber px-1 text-[10px] font-bold text-lt-bg">
                            {count}
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {count ? <span className="sr-only">({count} requieren atención)</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mx-3 mb-4 border-t border-lt-border px-3 pt-4">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} className="mb-3 w-full justify-start px-2 py-2 text-lt-muted hover:bg-lt-raised hover:text-lt-text" />
        <Link
          href="/dashboard/perfil"
          onClick={onNavigate}
          className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-lt-raised"
          aria-label={`Mi perfil: ${user.full_name}, ${ROLE_LABELS[user.role]}`}
        >
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lt-nav text-xs font-bold text-lt-indigo-soft">
            {initials(user.full_name)}
          </span>
          <span aria-hidden="true" className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-lt-text">{user.full_name}</span>
            <span className="block text-xs text-lt-indigo-soft">{ROLE_LABELS[user.role]}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-busy={loggingOut || undefined}
          className="mt-3 flex items-center gap-2 rounded-md px-1 py-1 text-sm text-lt-muted hover:text-lt-text disabled:opacity-60"
        >
          {loggingOut ? <Spinner /> : <LogOut aria-hidden="true" className="h-4 w-4" />}
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

interface SidebarProps {
  user: User;
  badges: NavBadges;
  theme: ThemeMode;
  onThemeToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ user, badges, theme, onThemeToggle, mobileOpen, onMobileClose }: SidebarProps) {
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
      <aside className="lt-side sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-lt-border bg-lt-sidebar md:flex">
        <SidebarContent user={user} badges={badges} theme={theme} onThemeToggle={onThemeToggle} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <aside
            id={MOBILE_NAV_ID}
            aria-label="Menú"
            className="lt-side absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-lt-border bg-lt-sidebar shadow-xl"
          >
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Cerrar menú"
              autoFocus
              className="absolute right-3 top-6 z-20 rounded-md p-1.5 text-lt-muted hover:bg-lt-raised hover:text-lt-text"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <SidebarContent user={user} badges={badges} theme={theme} onThemeToggle={onThemeToggle} onNavigate={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
