"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import type { User } from "@/types";
import { IdleTimeout } from "../IdleTimeout";
import { Logo } from "../Logo";
import { MOBILE_NAV_ID, Sidebar, type NavBadges } from "../Sidebar";
import { ThemeToggle, type ThemeMode } from "../ThemeToggle";

interface DashboardShellProps {
  user: User;
  badges: NavBadges;
  children: React.ReactNode;
}

const DEMO_ORGANIZATIONS = new Set(["Acme Demo", "Beta Corp"]);
// Atribución que pide la licencia CC BY 4.0 de DB-IP Lite, de donde salen el país, el ASN y el proveedor de las IP
// (BackKL NOTICE, RC-166). Va en todo el panel para que cubra cualquier pantalla que llegue a mostrar esos datos.
const DBIP_URL = "https://db-ip.com";
const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";
const FOOTER_LINK = "underline underline-offset-2 hover:text-lt-text";
const NEW_TAB = <span lang="es" className="sr-only"> (se abre en una pestaña nueva)</span>;

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("lowtide-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("lowtide-theme-change", onChange);
  };
}

function getThemeSnapshot(): ThemeMode {
  return window.localStorage.getItem("lowtide-theme") === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): ThemeMode {
  return "dark";
}

export function DashboardShell({ user, badges, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem("lowtide-theme", nextTheme);
    window.dispatchEvent(new Event("lowtide-theme-change"));
  };

  return (
    <div className={`${theme === "light" ? "lt-light" : "lt-dark"} min-h-dvh bg-lt-bg text-lt-text md:flex`}>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-lt-surface px-4 py-2 text-sm font-semibold text-lt-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Sidebar user={user} badges={badges} theme={theme} onThemeToggle={toggleTheme} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-lt-border bg-lt-bg/95 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls={MOBILE_NAV_ID}
            className="rounded-md p-2 text-lt-muted hover:bg-lt-raised hover:text-lt-text"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Logo tone={theme === "light" ? "light" : "dark"} />
          <span title={user.organization_name} className="min-w-0 flex-1 truncate text-xs font-medium text-lt-muted">
            {user.organization_name}
          </span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
        </header>
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-10">
          {DEMO_ORGANIZATIONS.has(user.organization_name) && (
            <div role="status" className="mb-6 border-l-2 border-lt-amber bg-lt-amber/5 px-4 py-3">
              <p className="text-sm font-semibold text-lt-amber">Datos de demostración</p>
              <p className="mt-0.5 text-xs text-lt-muted">Esta empresa usa información de prueba.</p>
            </div>
          )}
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-6 text-xs text-lt-muted md:px-10">
          <a href={DBIP_URL} lang="en" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            IP Geolocation by DB-IP{NEW_TAB}
          </a>
          {" · "}
          <a href={CC_BY_URL} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            CC BY 4.0{NEW_TAB}
          </a>
        </footer>
      </div>
      <IdleTimeout />
    </div>
  );
}
