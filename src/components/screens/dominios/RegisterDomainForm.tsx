"use client";

import { useRef, useState, type FormEvent } from "react";
import { Globe, ShieldCheck, Upload } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { registerDomain } from "@/services/domainService";
import { getErrorMessage } from "@/services/errors";
import type { Category, Domain, TxtVerification } from "@/types";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const SCOPES: { id: Category; label: string }[] = [
  { id: "infrastructure", label: "Infraestructura: subdominios, certificados y servicios expuestos (CT, Shodan)" },
  { id: "digital_identity", label: "Identidad digital: dominios parecidos (CT)" },
  { id: "configuration", label: "Configuración: registros DNS y de seguridad del correo (DNS, WHOIS)" },
  { id: "data_leaks", label: "Fugas de datos: correos corporativos en brechas (HIBP)" },
];

type Errors = Partial<Record<"fqdn" | "organization" | "signer_email" | "letter" | "valid_from" | "valid_until" | "scope" | "confirm", string>>;

export function RegisterDomainForm({ onRegistered }: { onRegistered: (domain: Domain, txt: TxtVerification) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [letter, setLetter] = useState<File | null>(null);
  const [scope, setScope] = useState<Category[]>(SCOPES.map((s) => s.id));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const fqdn = value("fqdn");
    const organization = value("organization");
    const signer_email = value("signer_email");
    const valid_from = value("valid_from");
    const valid_until = value("valid_until");

    const next: Errors = {};
    if (!fqdn) next.fqdn = "Escribe el dominio.";
    if (!organization) next.organization = "Escribe la organización.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer_email)) next.signer_email = "Escribe un correo válido.";
    if (!letter) next.letter = "Sube la carta de autorización firmada.";
    else if (letter.type !== "application/pdf") next.letter = "La carta debe ser un PDF.";
    else if (letter.size > MAX_PDF_BYTES) next.letter = "El PDF pesa más de 10 MB.";
    if (!valid_from) next.valid_from = "Elige la fecha de inicio.";
    if (!valid_until) next.valid_until = "Elige la fecha de fin.";
    else if (valid_from && valid_until <= valid_from) next.valid_until = "Debe ser posterior al inicio.";
    if (scope.length === 0) next.scope = "Elige al menos un alcance.";
    if (data.get("confirm") !== "on") next.confirm = "Confirma que la organización autorizó el monitoreo pasivo.";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length > 0 || !letter) return;

    setBusy(true);
    try {
      const { domain, txt } = await registerDomain(
        { fqdn, organization, signer_email, valid_from, valid_until, scope, passive_monitoring_confirmed: true },
        letter,
      );
      onRegistered(domain, txt);
      formRef.current?.reset();
      setLetter(null);
      setScope(SCOPES.map((s) => s.id));
      setResult({ tone: "success", message: `${domain.fqdn} quedó registrado. Para activarlo, publica el registro TXT que aparece en «Verificación TXT».` });
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const err = (name: keyof Errors) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    <Card
      title="Registrar dominio"
      description="Configura el alcance de monitoreo autorizado."
      icon={<Globe aria-hidden="true" className="h-4 w-4" />}
      action={
        <Badge tone="indigo">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> Solo Admin
        </Badge>
      }
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dominio" htmlFor="fqdn" error={errors.fqdn}>
            <input id="fqdn" name="fqdn" placeholder="ejemplo.com" autoComplete="off" className={`${INPUT} font-mono`} {...err("fqdn")} />
          </Field>
          <Field label="Organización" htmlFor="organization" error={errors.organization}>
            <input id="organization" name="organization" placeholder="Razón social" className={INPUT} {...err("organization")} />
          </Field>
        </div>
        <Field label="Responsable que autoriza (correo)" htmlFor="signer_email" error={errors.signer_email}>
          <input id="signer_email" name="signer_email" type="email" placeholder="ciso@organizacion.com" className={INPUT} {...err("signer_email")} />
        </Field>
        <Field label="Carta de autorización" htmlFor="letter" error={errors.letter}>
          <label
            htmlFor="letter"
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition hover:bg-lt-indigo/5 ${
              errors.letter ? "border-lt-red/60" : "border-lt-indigo/60"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 text-lt-indigo-soft">
              <Upload aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{letter ? letter.name : "Subir PDF"}</span>
            </span>
            <span className="shrink-0 text-xs text-lt-faint">Máx. 10 MB</span>
          </label>
          <input
            id="letter"
            name="letter"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => setLetter(e.target.files?.[0] ?? null)}
            {...err("letter")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vigente desde" htmlFor="valid_from" error={errors.valid_from}>
            <input id="valid_from" name="valid_from" type="date" className={INPUT} {...err("valid_from")} />
          </Field>
          <Field label="Hasta" htmlFor="valid_until" error={errors.valid_until}>
            <input id="valid_until" name="valid_until" type="date" className={INPUT} {...err("valid_until")} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-lt-muted">Alcance autorizado</legend>
          <div className="space-y-2">
            {SCOPES.map((s) => (
              <label key={s.id} className="flex items-start gap-2.5 text-[13px] text-lt-text">
                <input
                  type="checkbox"
                  className={`${CHECKBOX} mt-0.5`}
                  checked={scope.includes(s.id)}
                  onChange={(e) => setScope((current) => (e.target.checked ? [...current, s.id] : current.filter((c) => c !== s.id)))}
                />
                {s.label}
              </label>
            ))}
          </div>
          {errors.scope && <p className="mt-1.5 text-xs font-medium text-lt-red">{errors.scope}</p>}
        </fieldset>
        <div className="rounded-lg border border-lt-border bg-lt-raised/60 p-3.5">
          <label className="flex items-start gap-2.5 text-[13px] text-lt-muted">
            <input type="checkbox" name="confirm" className={`${CHECKBOX} mt-0.5`} {...err("confirm")} />
            Confirmo que la organización autorizó el monitoreo pasivo (solo fuentes abiertas, sin explotación ni acceso no autorizado).
          </label>
          {errors.confirm && (
            <p id="confirm-error" className="mt-1.5 text-xs font-medium text-lt-red">
              {errors.confirm}
            </p>
          )}
        </div>
        {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
        <ActionButton type="submit" loading={busy} className="h-11 w-full">
          Registrar dominio
        </ActionButton>
      </form>
    </Card>
  );
}
