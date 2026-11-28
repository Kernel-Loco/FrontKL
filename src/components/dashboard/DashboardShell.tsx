"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import type { User } from "@/types";
import { IdleTimeout } from "../IdleTimeout";
import { Logo } from "../Logo";
import { DESKTOP_NAV_ID, MOBILE_NAV_ID, Sidebar, type NavBadges } from "../Sidebar";
import { ThemeToggle, type ThemeMode } from "../ThemeToggle";
import { tx } from "@/i18n/tx";

interface DashboardShellProps {
  /** null: la API no respondió al validar la sesión (#108, RC-225). El menú sigue, sin datos de la cuenta. */
  user: User | null;
  badges: NavBadges;
  children: React.ReactNode;
}

const DEMO_ORGANIZATIONS = new Set(["Acme Demo", "Beta Corp"]);
// Atribución que pide la licencia CC BY 4.0 de DB-IP Lite, de donde salen el país, el ASN y el proveedor de las IP
// (BackKL NOTICE, RC-166). Va en todo el panel para que cubra cualquier pantalla que llegue a mostrar esos datos.
const DBIP_URL = "https://db-ip.com";
const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";
const FOOTER_LINK = "underline underline-offset-2 hover:text-lt-text";
const NEW_TAB = <span lang="es" className="sr-only"> {" "}{tx("(se abre en una pestaña nueva)")}</span>;

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

// Menú lateral oculto en escritorio (RC-369). Se recuerda en este navegador; si el almacenamiento falla, se muestra.
const SIDEBAR_KEY = "lowtide-sidebar";

function subscribeToSidebar(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("lowtide-sidebar-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("lowtide-sidebar-change", onChange);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "hidden";
  } catch {
    return false;
  }
}

function setSidebarHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(SIDEBAR_KEY, "hidden");
    else window.localStorage.removeItem(SIDEBAR_KEY);
  } catch {
    // Sin almacenamiento el menú solo vuelve a mostrarse al recargar.
  }
  window.dispatchEvent(new Event("lowtide-sidebar-change"));
}

export function DashboardShell({ user, badges, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const sidebarHidden = useSyncExternalStore(subscribeToSidebar, getSidebarSnapshot, () => false);
  const hideSidebar = useCallback(() => setSidebarHidden(true), []);

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
        {tx("Saltar al contenido")}</a>
      <Sidebar user={user} badges={badges} theme={theme} onThemeToggle={toggleTheme} mobileOpen={menuOpen} onMobileClose={closeMenu} collapsed={sidebarHidden} onCollapse={hideSidebar} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {sidebarHidden && (
          <button
            type="button"
            onClick={() => setSidebarHidden(false)}
            aria-label={tx("Mostrar menú")}
            aria-controls={DESKTOP_NAV_ID}
            aria-expanded={false}
            title={tx("Mostrar menú")}
            className="absolute left-3 top-3 z-30 hidden rounded-md p-1.5 text-lt-faint hover:text-lt-text md:block"
          >
            <Menu aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-lt-border bg-lt-bg px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={tx("Abrir menú")}
            aria-expanded={menuOpen}
            aria-controls={MOBILE_NAV_ID}
            className="rounded-md p-2 text-lt-muted hover:bg-lt-raised hover:text-lt-text"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Logo tone={theme === "light" ? "light" : "dark"} />
          <span title={user?.organization_name} className="min-w-0 flex-1 truncate text-xs font-medium text-lt-muted">
            {user?.organization_name}
          </span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
        </header>
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-10">
          {user && DEMO_ORGANIZATIONS.has(user.organization_name) && (
            <p role="status" className="mb-6 flex items-center gap-2 text-sm text-lt-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-lt-indigo-soft" />
              <span>
                <span className="font-medium text-lt-text">{tx("Datos de demostración.")}</span> {" "}{tx("Esta empresa usa información de prueba.")}</span>
            </p>
          )}
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-6 text-xs text-lt-muted md:px-10">
          <Link href="/seguridad" className={FOOTER_LINK}>
            {tx("Seguridad")}</Link>
          {" · "}
          <Link href="/privacidad" className={FOOTER_LINK}>
            {tx("Aviso de privacidad")}</Link>
          {" · "}
          <Link href="/terminos" className={FOOTER_LINK}>
            {tx("Términos de uso")}</Link>
          {" · "}
          <a href={DBIP_URL} lang="en" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            {tx("IP Geolocation by DB-IP")}{NEW_TAB}
          </a>
          {" · "}
          <a href={CC_BY_URL} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            {tx("CC BY 4.0")}{NEW_TAB}
          </a>
        </footer>
      </div>
      {user && <IdleTimeout limits={user.session_limits} userId={user.id} />}
    </div>
  );
}
