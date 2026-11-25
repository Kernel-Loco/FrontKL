"use client";

import { useState } from "react";
import { Globe, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cantidad } from "@/lib/format";
import type { Domain, SignatureRequest, SignatureRequestList, TxtVerification } from "@/types";
import { HibpVerificationGuide } from "./HibpVerificationGuide";
import { RegisterDomainForm } from "./RegisterDomainForm";
import { RegisteredDomainsTable } from "./RegisteredDomainsTable";
import { SignatureRequestsList } from "./SignatureRequestsList";
import { TxtVerificationList } from "./TxtVerificationList";

interface DomainsAdminProps {
  domains: Domain[];
  txt: TxtVerification[];
  signatures: SignatureRequestList;
}

/** Vista del Admin: registro de dominios, inventario y verificación TXT. */
export function DomainsAdmin({ domains: initialDomains, txt: initialTxt, signatures }: DomainsAdminProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [txt, setTxt] = useState(initialTxt);
  const [requests, setRequests] = useState(signatures.items);

  // Una carta nueva de un dominio que ya estaba (renovación, RC-211) trae el mismo dominio: se reemplaza, no se repite.
  const upsert = (domain: Domain, record: TxtVerification) => {
    setDomains((current) => (current.some((d) => d.id === domain.id) ? current.map((d) => (d.id === domain.id ? domain : d)) : [...current, domain]));
    setTxt((current) => (current.some((t) => t.fqdn === record.fqdn) ? current.map((t) => (t.fqdn === record.fqdn ? record : t)) : [...current, record]));
  };
  const putRequest = (item: SignatureRequest) =>
    setRequests((current) => (current.some((r) => r.id === item.id) ? current.map((r) => (r.id === item.id ? item : r)) : [item, ...current]));

  return (
    // Una sola columna a todo ancho: en dos, desde 1536 px el inventario queda en unos 650 px y la tabla
    // (correo y 'Ver' sin cortes) pide unos 720, con scroll y 'Ver' fuera de vista.
    <div className="space-y-6">
      <div className="space-y-6">
        <RegisterDomainForm onRegistered={upsert} onSent={putRequest} apiMode={signatures.mode} />
        <SignatureRequestsList items={requests} mode={signatures.mode} onChange={putRequest} onAccepted={upsert} />
        <HibpVerificationGuide />
      </div>
      <Card
        title="Dominios registrados"
        icon={<Globe aria-hidden="true" className="h-4 w-4" />}
        action={`${cantidad(domains.length, "dominio")} en inventario`}
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
            onChange={(domain, item) => {
              setDomains((current) => current.map((d) => (d.id === domain.id ? domain : d)));
              setTxt((current) => current.map((t) => (t.fqdn === item.fqdn ? item : t)));
            }}
          />
        </div>
      </Card>
    </div>
  );
}
