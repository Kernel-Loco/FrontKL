"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Field, INPUT, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { FINDING_STATUS_LABELS } from "@/config/labels";
import { formatDate } from "@/lib/format";
import {
  NOTE_MAX,
  resolvedReasons,
  reviewDateError,
  reviewDateRange,
  TRIAGE_CHOICE_HELP,
  TRIAGE_CHOICE_LABELS,
  triageChoices,
  triageRequest,
  triageSummary,
  type TriageChoice,
} from "@/lib/triage";
import { getErrorMessage } from "@/services/errors";
import { triageFinding } from "@/services/triageService";
import type { DomainFinding, FindingStatus, ResolvedReason } from "@/types";

const STATUS_TONE: Record<FindingStatus, "gray" | "green" | "amber" | "blue"> = {
  open: "gray",
  resolved: "green",
  accepted_risk: "amber",
  false_positive: "blue",
};

/**
 * Botones y estados de triage del hallazgo elegido (#80b, RC-172). Solo Analista y Admin: la API da 403 a los demás.
 * Al guardar, la página se vuelve a pedir: el hallazgo cambia de pestaña y el score, si se recalculó, se actualiza.
 */
export function TriagePanel({ finding, canTriage }: { finding: DomainFinding; canTriage: boolean }) {
  const router = useRouter();
  const ids = { date: useId(), reason: useId(), note: useId() };
  const choices = triageChoices(finding.status);
  const range = reviewDateRange();
  const [choice, setChoice] = useState<TriageChoice | null>(null);
  const [reviewDate, setReviewDate] = useState(finding.triage?.review_date ?? range.suggested);
  const [reason, setReason] = useState<ResolvedReason>("fixed");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const reasons = resolvedReasons(finding.rule_code);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!choice) return;
    if (choice === "accepted_risk") {
      const error = reviewDateError(reviewDate);
      if (error) {
        setMessage({ tone: "error", text: error });
        return;
      }
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await triageFinding(finding.id, triageRequest(choice, { reviewDate, reason, note }));
      setMessage({
        tone: "success",
        text: `Hallazgo en «${FINDING_STATUS_LABELS[result.status]}».${result.score_recalculated ? " El score del dominio se recalculó." : ""}`,
      });
      setChoice(null);
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: getErrorMessage(error, { apiMessageOn403: true }) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Estado del hallazgo" className="rounded-xl bg-lt-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-lt-text">
          <ClipboardCheck aria-hidden="true" className="h-4 w-4 text-lt-indigo-soft" />
          Estado del hallazgo
        </h3>
        <Badge tone={STATUS_TONE[finding.status]} dot>{FINDING_STATUS_LABELS[finding.status]}</Badge>
      </header>
      {finding.triage && <p className="mt-2 text-xs text-lt-muted">{triageSummary(finding.triage, formatDate)}</p>}
      {finding.triage?.note && <p className="mt-1 text-xs italic text-lt-muted">«{finding.triage.note}»</p>}

      {!canTriage ? (
        <p className="mt-3 text-xs text-lt-faint">Solo Analista y Administrador cambian el estado de un hallazgo.</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div role="group" aria-label="Cambiar estado" className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <ActionButton
                key={c}
                size="sm"
                variant={choice === c ? "primary" : "secondary"}
                aria-pressed={choice === c}
                onClick={() => {
                  setChoice(choice === c ? null : c);
                  setMessage(null);
                }}
              >
                {c === "accepted_risk" && finding.status === "accepted_risk" ? "Cambiar fecha" : TRIAGE_CHOICE_LABELS[c]}
              </ActionButton>
            ))}
          </div>

          {choice && (
            <div className="space-y-3 rounded-lg bg-lt-raised/40 p-3">
              <p className="text-xs text-lt-muted">{TRIAGE_CHOICE_HELP[choice]}</p>
              {choice === "accepted_risk" && (
                <Field label="Fecha de revisión" htmlFor={ids.date} hint="Ese día el hallazgo vuelve al plan de acción.">
                  <input id={ids.date} type="date" required min={range.min} max={range.max} value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)} className={INPUT} />
                </Field>
              )}
              {choice === "resolved" && reasons.length > 1 && (
                <Field label="Motivo" htmlFor={ids.reason}>
                  <select id={ids.reason} value={reason} onChange={(e) => setReason(e.target.value as ResolvedReason)} className={SELECT}>
                    {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Nota (opcional)" htmlFor={ids.note} hint={`Queda en la bitácora. Hasta ${NOTE_MAX} caracteres.`}>
                <textarea id={ids.note} value={note} maxLength={NOTE_MAX} rows={2}
                  onChange={(e) => setNote(e.target.value)} className={`${INPUT} h-auto py-2`} />
              </Field>
              <div className="flex justify-end">
                <ActionButton type="submit" size="sm" loading={saving}>Guardar</ActionButton>
              </div>
            </div>
          )}
        </form>
      )}
      {message && <InlineAlert tone={message.tone} className="mt-3">{message.text}</InlineAlert>}
    </section>
  );
}
