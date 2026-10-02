"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { ROLE_LABELS } from "@/config/permissions";
import { logout } from "@/services/authService";
import type { User } from "@/types";
import { MOBILE_NAV_ID } from "./Sidebar";
import { Spinner } from "./Spinner";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

interface HeaderProps {
  user: User;
  menuOpen: boolean;
  onMenuClick: () => void;
}

export function Header({ user, menuOpen, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace("/login?notice=logout");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        aria-controls={MOBILE_NAV_ID}
        className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-cirdan-500 text-sm font-semibold text-white"
        >
          {initials(user.full_name)}
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
          <p className="text-xs text-slate-500">@{user.username}</p>
        </div>
        <span className="rounded-full bg-cirdan-100 px-2.5 py-0.5 text-xs font-semibold text-cirdan-700">
          <span className="sr-only">Rol: </span>
          {ROLE_LABELS[user.role]}
        </span>
        <span aria-hidden="true" className="h-6 w-px bg-slate-200" />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-busy={loggingOut || undefined}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {loggingOut ? <Spinner /> : <LogOut aria-hidden="true" className="h-4 w-4" />}
          <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
