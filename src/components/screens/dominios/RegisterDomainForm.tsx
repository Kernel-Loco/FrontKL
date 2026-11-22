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
import { ANEXO_A, PLANTILLA_VIGENTE, actividadesMarcadas } from "@/lib/anexoA";
import type { Domain, TxtVerification } from "@/types";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

type Errors = Partial<Record<"fqdn" | "signer_name" | "signer_title" | "signer_email" | "letter" | "valid_from" | "valid_until" | "activities" | "confirm", string>>;

export function RegisterDomainForm({ onRegistered }: { onRegistered: (domain: Domain, txt: TxtVerification) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [letter, setLetter] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const fqdn = value("fqdn");
    const signer_name = value("signer_name");
    const signer_title = value("signer_title");
    const signer_email = value("signer_email");
    const valid_from = value("valid_from");
    const valid_until = value("valid_until");
    const activities = actividadesMarcadas(data.getAll("activities"));

    const next: Errors = {};
    if (!fqdn) next.fqdn = "Escribe el dominio.";
    if (!signer_name || signer_name.length > 200) next.signer_name = "Escribe el nombre de quien firma (máximo 200 caracteres).";
    if (!signer_title || signer_title.length > 200) next.signer_title = "Escribe el cargo de quien firma (máximo 200 caracteres).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer_email)) next.signer_email = "Escribe un correo válido.";
    if (!letter) next.letter = "Sube la carta de autorización firmada.";
    else if (letter.type !== "application/pdf") next.letter = "La carta debe ser un PDF.";
    else if (letter.size > MAX_PDF_BYTES) next.letter = "El PDF pesa más de 5 MB.";
    if (!valid_from) next.valid_from = "Elige la fecha de inicio.";
    if (!valid_until) next.valid_until = "Elige la fecha de fin.";
    else if (valid_from && valid_until <= valid_from) next.valid_until = "Debe ser posterior al inicio.";
    if (activities.length === 0) next.activities = "Marca al menos una actividad que autoriza la carta.";
    if (data.get("confirm") !== "on") next.confirm = "Confirma que la organización autorizó el monitoreo pasivo.";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length > 0 || !letter) return;

    setBusy(true);
    try {
      const { domain, txt } = await registerDomain(
        {
          fqdn,
          signer_name,
          signer_title,
          signer_email,
          valid_from,
          valid_until,
          passive_monitoring_confirmed: true,
          template_version: PLANTILLA_VIGENTE,
          activities,
        },
        letter,
      );
      onRegistered(domain, txt);
      formRef.current?.reset();
      setLetter(null);
      setResult({ tone: "success", message: `${domain.fqdn} quedó registrado. Publica el TXT de «Verificación TXT» para comprobar el dominio.` });
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
      description="Marca las actividades del Anexo A que autoriza la carta firmada."
      icon={<Globe aria-hidden="true" className="h-4 w-4" />}
      action={
        <Badge tone="indigo">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> Solo Administrador
        </Badge>
      }
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dominio" htmlFor="fqdn" error={errors.fqdn}>
            <input id="fqdn" name="fqdn" placeholder="ejemplo.com" autoComplete="off" className={`${INPUT} font-mono`} {...err("fqdn")} />
          </Field>
          <Field label="Nombre de quien firma" htmlFor="signer_name" error={errors.signer_name}>
            <input id="signer_name" name="signer_name" maxLength={200} className={INPUT} {...err("signer_name")} />
          </Field>
        </div>
        <Field label="Cargo de quien firma" htmlFor="signer_title" error={errors.signer_title}>
          <input id="signer_title" name="signer_title" maxLength={200} className={INPUT} {...err("signer_title")} />
        </Field>
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
            <span className="shrink-0 text-xs text-lt-faint">Máx. 5 MB</span>
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
        <fieldset aria-describedby={errors.activities ? "activities-error" : undefined}>
          <legend className="mb-2 text-xs font-medium text-lt-muted">Actividades que autoriza la carta (Anexo A)</legend>
          <ul className="space-y-2">
            {ANEXO_A.map((a) => (
              <li key={a.id}>
                <label className="flex items-start gap-2.5 text-[13px] text-lt-text">
                  <input type="checkbox" name="activities" value={a.id} defaultChecked className={`${CHECKBOX} mt-0.5`} />
                  <span>
                    {a.id}. {a.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-lt-faint">Desmarca las que la carta firmada no autoriza. Esas fuentes no corren en los análisis.</p>
          {errors.activities && (
            <p id="activities-error" className="mt-1.5 text-xs font-medium text-lt-red">
              {errors.activities}
            </p>
          )}
        </fieldset>
        <div className="rounded-lg border border-lt-border bg-lt-raised/60 p-3.5">
          <label className="flex items-start gap-2.5 text-[13px] text-lt-muted">
            <input type="checkbox" name="confirm" className={`${CHECKBOX} mt-0.5`} {...err("confirm")} />
            Confirmo que la carta está firmada, que autoriza el dominio y las actividades marcadas, y que tengo permiso para registrarlo para mi organización.
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
