"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileCode2, Globe, ShieldCheck, Upload } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ApiError } from "@/lib/apiClient";
import { registerDomain, sendForSignature, uploadMifielSigned } from "@/services/domainService";
import { getErrorMessage } from "@/services/errors";
import { ANEXO_A, PLANTILLA_VIGENTE, actividadesMarcadas } from "@/lib/anexoA";
import type { Domain, DomainRegistrationRequest, SignatureRequest, SignatureRequestList, TxtVerification } from "@/types";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_XML_BYTES = 7 * 1024 * 1024;
const VERIFY_XML = "https://app.mifiel.com/verify-xml";

/** Cómo llega la carta (RC-211): subida a mano, firmada en la web de Mifiel (camino A) o mandada a firmar (camino B). */
type LetterMode = "manual" | "mifiel_web" | "mifiel_api";

const MODES: { id: LetterMode; label: string }[] = [
  { id: "manual", label: "Subir carta firmada" },
  { id: "mifiel_web", label: "Firmada en Mifiel" },
  { id: "mifiel_api", label: "Enviar a firmar" },
];

type Errors = Partial<
  Record<"fqdn" | "signer_name" | "signer_title" | "signer_email" | "letter" | "xml" | "valid_from" | "valid_until" | "activities" | "confirm", string>
>;

/** El 502 y el 503 de la firma traen un texto propio de la API (Mifiel no respondió, firma apagada) que sí sirve mostrar. */
export function signatureError(error: unknown): string {
  if (error instanceof ApiError && (error.status === 502 || error.status === 503) && error.message) return error.message;
  return getErrorMessage(error);
}

interface RegisterDomainFormProps {
  onRegistered: (domain: Domain, txt: TxtVerification) => void;
  onSent?: (request: SignatureRequest) => void;
  /** Modo de la API de Mifiel. Con off o sin dato no se ofrece mandar a firmar. */
  apiMode?: SignatureRequestList["mode"];
}

export function RegisterDomainForm({ onRegistered, onSent, apiMode }: RegisterDomainFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<LetterMode>("manual");
  const [letter, setLetter] = useState<File | null>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const apiOn = apiMode === "sandbox" || apiMode === "production";
  const current: LetterMode = mode === "mifiel_api" && !apiOn ? "manual" : mode;

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
    if (!letter) next.letter = current === "mifiel_api" ? "Sube la carta de autorización sin firmar." : "Sube la carta de autorización firmada.";
    else if (letter.type !== "application/pdf") next.letter = "La carta debe ser un PDF.";
    else if (letter.size > MAX_PDF_BYTES) next.letter = "El PDF pesa más de 5 MB.";
    if (current === "mifiel_web") {
      if (!xml) next.xml = "Sube el XML que entrega Mifiel.";
      else if (xml.size > MAX_XML_BYTES) next.xml = "El XML pesa más de 7 MB.";
    }
    if (!valid_from) next.valid_from = "Elige la fecha de inicio.";
    if (!valid_until) next.valid_until = "Elige la fecha de fin.";
    else if (valid_from && valid_until <= valid_from) next.valid_until = "Debe ser posterior al inicio.";
    if (activities.length === 0) next.activities = "Marca al menos una actividad que autoriza la carta.";
    if (data.get("confirm") !== "on") next.confirm = "Confirma que la organización autorizó el monitoreo pasivo.";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length > 0 || !letter) return;

    const request: DomainRegistrationRequest = {
      fqdn,
      signer_name,
      signer_title,
      signer_email,
      valid_from,
      valid_until,
      passive_monitoring_confirmed: true,
      template_version: PLANTILLA_VIGENTE,
      activities,
    };
    setBusy(true);
    try {
      if (current === "mifiel_api") {
        const sent = await sendForSignature(request, letter);
        onSent?.(sent);
        setResult({
          tone: "success",
          message: `Mifiel mandó la invitación a ${sent.signer_email}. Cuando firme, consulta el estado en «Cartas en firma» y confírmala.`,
        });
      } else {
        const { domain, txt } =
          current === "mifiel_web" && xml ? await uploadMifielSigned(request, letter, xml) : await registerDomain(request, letter);
        onRegistered(domain, txt);
        setResult({
          tone: "success",
          message:
            current === "mifiel_web"
              ? `La carta de ${domain.fqdn} quedó registrada con el XML de Mifiel. Si el dominio es nuevo, publica el TXT de «Verificación TXT».`
              : `${domain.fqdn} quedó registrado. Publica el TXT de «Verificación TXT» para comprobar el dominio.`,
        });
      }
      formRef.current?.reset();
      setLetter(null);
      setXml(null);
    } catch (error) {
      setResult({ tone: "error", message: current === "mifiel_api" ? signatureError(error) : getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const err = (name: keyof Errors) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    <Card
      title="Registrar dominio"
      description="Elige cómo llega la carta y marca las actividades del Anexo A que autoriza."
      icon={<Globe aria-hidden="true" className="h-4 w-4" />}
      action={
        <Badge tone="indigo">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> Solo Administrador
        </Badge>
      }
    >
      <div role="radiogroup" aria-label="Cómo llega la carta" className="mb-4 grid gap-2 sm:grid-cols-3">
        {MODES.filter((m) => m.id !== "mifiel_api" || apiOn).map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={current === m.id}
            disabled={busy}
            onClick={() => {
              setMode(m.id);
              setErrors({});
              setResult(null);
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              current === m.id ? "border-lt-indigo-soft bg-lt-indigo/10 text-lt-text" : "border-lt-border text-lt-muted hover:bg-lt-raised/60"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {current === "mifiel_web" && (
        <p className="mb-4 text-xs text-lt-muted">
          Sube el PDF firmado y el XML que descargaste de Mifiel. El XML trae la constancia NOM-151. Antes de subirlo, revísalo en{" "}
          <a href={VERIFY_XML} target="_blank" rel="noopener noreferrer" className="font-medium text-lt-indigo-soft underline underline-offset-2">
            app.mifiel.com/verify-xml
          </a>
          .
        </p>
      )}
      {current === "mifiel_api" && (
        <p className="mb-4 text-xs text-lt-muted">
          Sube la carta sin firmar. Mifiel invita por correo a quien firma, que firma con su e.firma. La carta cuenta para el dominio hasta que la
          confirmes en «Cartas en firma».
          {apiMode === "sandbox" ? " Mifiel está en modo de pruebas: esta firma no tiene validez legal." : ""}
        </p>
      )}
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
        <Field
          label={current === "mifiel_api" ? "Correo de quien firma (ahí llega la invitación de Mifiel)" : "Responsable que autoriza (correo)"}
          htmlFor="signer_email"
          error={errors.signer_email}
        >
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
              <span className="truncate">{letter ? letter.name : current === "mifiel_api" ? "Subir PDF sin firmar" : "Subir PDF firmado"}</span>
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
        {current === "mifiel_web" && (
          <Field label="XML de Mifiel" htmlFor="xml" error={errors.xml}>
            <label
              htmlFor="xml"
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition hover:bg-lt-indigo/5 ${
                errors.xml ? "border-lt-red/60" : "border-lt-indigo/60"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-lt-indigo-soft">
                <FileCode2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{xml ? xml.name : "Subir XML"}</span>
              </span>
              <span className="shrink-0 text-xs text-lt-faint">Máx. 7 MB</span>
            </label>
            <input
              id="xml"
              name="xml"
              type="file"
              accept=".xml,application/xml,text/xml"
              className="sr-only"
              onChange={(e) => setXml(e.target.files?.[0] ?? null)}
              {...err("xml")}
            />
          </Field>
        )}
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
          <p className="mt-2 text-xs text-lt-faint">Desmarca las que la carta no autoriza. Esas fuentes no corren en los análisis.</p>
          {errors.activities && (
            <p id="activities-error" className="mt-1.5 text-xs font-medium text-lt-red">
              {errors.activities}
            </p>
          )}
        </fieldset>
        <div className="rounded-lg border border-lt-border bg-lt-raised/60 p-3.5">
          <label className="flex items-start gap-2.5 text-[13px] text-lt-muted">
            <input type="checkbox" name="confirm" className={`${CHECKBOX} mt-0.5`} {...err("confirm")} />
            {current === "mifiel_api"
              ? "Confirmo que la carta autoriza el dominio y las actividades marcadas, que quien firma tiene facultad para hacerlo y que tengo permiso para mandarla a firmar para mi organización."
              : "Confirmo que la carta está firmada, que autoriza el dominio y las actividades marcadas, y que tengo permiso para registrarlo para mi organización."}
          </label>
          {errors.confirm && (
            <p id="confirm-error" className="mt-1.5 text-xs font-medium text-lt-red">
              {errors.confirm}
            </p>
          )}
        </div>
        {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
        <ActionButton type="submit" loading={busy} className="h-11 w-full">
          {current === "mifiel_api" ? "Enviar a firmar con Mifiel" : "Registrar carta"}
        </ActionButton>
      </form>
    </Card>
  );
}
