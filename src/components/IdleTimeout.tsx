"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import {
  ABSOLUTE_WARNING_MS,
  API_ACTIVITY_EVENT,
  effectiveIdleMs,
  idleWarningMs,
  SESSION_REFRESH_INTERVAL_MS,
} from "@/config/session";
import { getCurrentUser, logout } from "@/services/authService";
import type { SessionLimits } from "@/types";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const;

type Reason = "idle" | "absolute";
interface Warning {
  reason: Reason;
  secondsLeft: number;
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}

/**
 * Cuenta la sesión con los dos vencimientos del servidor (/auth/me): la inactividad, que cualquier
 * petición autenticada renueva (también el sondeo de un escaneo), y el tope absoluto, que no se puede
 * extender. Sin esos datos usa la configuración local. Avisa antes de cerrar y, al vencer, sale al login.
 */
export function IdleTimeout({ limits }: { limits?: SessionLimits }) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const idleSpan = useRef(effectiveIdleMs(limits?.idle_timeout_seconds));
  const idleDeadline = useRef(0);
  const absoluteDeadline = useRef(Infinity);
  const lastRefresh = useRef(0);
  const warningOpen = useRef(false);
  const absoluteDismissed = useRef(false);
  const ending = useRef(false);
  const [warning, setWarning] = useState<Warning | null>(null);

  const endSession = useCallback(
    async (target: string) => {
      if (ending.current) return;
      ending.current = true;
      await logout();
      router.replace(target);
      router.refresh();
    },
    [router],
  );

  const applyLimits = useCallback((next: SessionLimits | undefined, now: number) => {
    if (!next) return;
    idleSpan.current = effectiveIdleMs(next.idle_timeout_seconds);
    absoluteDeadline.current = now + next.absolute_expires_in_seconds * 1000;
  }, []);

  // Renueva la sesión en el servidor y toma de ahí los vencimientos vigentes.
  const syncWithServer = useCallback(() => {
    void getCurrentUser()
      .then((user) => {
        if (!user) {
          void endSession("/login?notice=expired");
          return;
        }
        const now = Date.now();
        applyLimits(user.session_limits, now);
        idleDeadline.current = now + idleSpan.current;
      })
      .catch(() => {});
  }, [applyLimits, endSession]);

  useEffect(() => {
    const now = Date.now();
    applyLimits(limits, now);
    idleDeadline.current = now + idleSpan.current;

    const onActivity = () => {
      // Con el aviso de inactividad abierto, solo el botón "Continuar" mantiene la sesión.
      if (warningOpen.current) return;
      const at = Date.now();
      idleDeadline.current = at + idleSpan.current;
      if (at - lastRefresh.current >= SESSION_REFRESH_INTERVAL_MS) {
        lastRefresh.current = at;
        syncWithServer();
      }
    };

    // El servidor renovó la inactividad con esa petición: el portal cuenta igual que él.
    const onApiActivity = () => {
      idleDeadline.current = Date.now() + idleSpan.current;
    };

    const tick = () => {
      const at = Date.now();
      const idleLeft = idleDeadline.current - at;
      const absoluteLeft = absoluteDeadline.current - at;
      const reason: Reason = absoluteLeft <= idleLeft ? "absolute" : "idle";
      const left = Math.min(idleLeft, absoluteLeft);
      if (left <= 0) {
        void endSession("/login?notice=expired");
        return;
      }
      const threshold = reason === "absolute" ? ABSOLUTE_WARNING_MS : idleWarningMs(idleSpan.current);
      const show = left <= threshold && !(reason === "absolute" && absoluteDismissed.current);
      warningOpen.current = show && reason === "idle";
      setWarning(show ? { reason, secondsLeft: Math.ceil(left / 1000) } : null);
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    window.addEventListener(API_ACTIVITY_EVENT, onApiActivity);
    const interval = setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.removeEventListener(API_ACTIVITY_EVENT, onApiActivity);
      clearInterval(interval);
    };
  }, [applyLimits, endSession, limits, syncWithServer]);

  const keepAlive = () => {
    const now = Date.now();
    warningOpen.current = false;
    idleDeadline.current = now + idleSpan.current;
    lastRefresh.current = now;
    setWarning(null);
    syncWithServer();
  };

  if (warning === null) return null;
  const isAbsolute = warning.reason === "absolute";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-xl border border-lt-border bg-lt-surface p-6 shadow-2xl"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lt-indigo/15">
          <Clock aria-hidden="true" className="h-6 w-6 text-lt-indigo-soft" />
        </div>
        <h2 id={titleId} className="mt-4 text-lg font-bold text-lt-text">
          {isAbsolute ? "Tu sesión está por llegar a su límite" : "¿Sigues ahí?"}
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-lt-muted">
          {isAbsolute
            ? "Por seguridad, la sesión dura un máximo de 8 horas. Guarda tu trabajo: se cerrará en "
            : "Por seguridad, tu sesión se cerrará por inactividad en "}
          <strong className="tabular-nums text-lt-text">{formatWait(warning.secondsLeft)}</strong>
          {isAbsolute ? " y tendrás que iniciar sesión de nuevo." : "."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void endSession("/login?notice=logout")}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-lt-muted hover:bg-lt-raised"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            autoFocus
            onClick={
              isAbsolute
                ? () => {
                    absoluteDismissed.current = true;
                    setWarning(null);
                  }
                : keepAlive
            }
            className="rounded-lg bg-gradient-to-r from-lt-indigo to-lt-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            {isAbsolute ? "Entendido" : "Continuar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
