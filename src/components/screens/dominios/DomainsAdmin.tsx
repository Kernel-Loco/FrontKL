"use client";

import { useState } from "react";
import { Globe, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Domain, TxtVerification } from "@/types";
import { RegisterDomainForm } from "./RegisterDomainForm";
import { RegisteredDomainsTable } from "./RegisteredDomainsTable";
import { TxtVerificationList } from "./TxtVerificationList";

interface DomainsAdminProps {
  domains: Domain[];
  txt: TxtVerification[];
}

/** Vista del Admin: registro de dominios, inventario y verificación TXT. */
export function DomainsAdmin({ domains: initialDomains, txt: initialTxt }: DomainsAdminProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [txt, setTxt] = useState(initialTxt);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <RegisterDomainForm
        onRegistered={(domain, record) => {
          setDomains((current) => [...current, domain]);
          setTxt((current) => [...current, record]);
        }}
      />
      <Card
        title="Dominios registrados"
        icon={<Globe aria-hidden="true" className="h-4 w-4" />}
        action={`${domains.length} dominios en inventario`}
      >
        <div className="-mx-5">
          <RegisteredDomainsTable domains={domains} canOpenDetail />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-lt-border bg-lt-raised/50 px-3 py-2.5 text-xs text-lt-muted">
          <TriangleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          Un dominio vencido o por validar no se puede escanear ni exportar. Se necesita la verificación TXT para activar el monitoreo.
        </p>
        <div className="mt-6">
          <TxtVerificationList
            items={txt}
            onChange={(item) => setTxt((current) => current.map((t) => (t.fqdn === item.fqdn ? item : t)))}
          />
        </div>
      </Card>
    </div>
  );
}
