import Link from "next/link";

export interface Tab {
  label: string;
  href: string;
  active?: boolean;
}

/** Pestañas de un dominio: Resumen, Hallazgos e Histórico. */
export function DomainTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav aria-label="Secciones del dominio" className="border-b border-lt-border">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`inline-block whitespace-nowrap border-b-2 px-1 pb-3 text-sm transition-colors ${
                tab.active ? "border-lt-teal font-semibold text-lt-text" : "border-transparent text-lt-muted hover:text-lt-text"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Pestañas que ve cada rol en un dominio. */
export function domainTabs(fqdn: string, findingsCount: number, active: "resumen" | "hallazgos" | "historico", canSeeFindings: boolean): Tab[] {
  const q = `?dominio=${encodeURIComponent(fqdn)}`;
  return [
    { label: "Resumen", href: `/dashboard/dominios/${fqdn}`, active: active === "resumen" },
    ...(canSeeFindings ? [{ label: `Hallazgos (${findingsCount})`, href: `/dashboard/hallazgos${q}`, active: active === "hallazgos" }] : []),
    { label: "Histórico", href: `/dashboard/historico${q}`, active: active === "historico" },
  ];
}
