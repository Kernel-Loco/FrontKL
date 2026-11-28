"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  ABSOLUTE_WARNING_MS,
  API_ACTIVITY_EVENT,
  effectiveIdleMs,
  idleWarningMs,
  SESSION_REFRESH_INTERVAL_MS,
} from "@/config/session";
import {
  ACTIVITY_KEY,
  announceEnded,
  CONFIRM_RETRY_MS,
  ENDED_KEY,
  endedElsewhere,
  mustConfirmBeforeMax,
  needsServerCheck,
  recordActivity,
  SHARE_INTERVAL_MS,
  sharedIdleDeadline,
  sharedStore,
} from "@/lib/session/actividad";
import { leaveSession, loginNoticeFrom, type LoginNotice } from "@/lib/session/logout";
import { getCurrentUser, logout } from "@/services/authService";
import type { SessionLimits } from "@/types";
import { tx } from "@/i18n/tx";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const;

type Reason = "idle" | "absolute";
interface Warning {
  reason: Reason;
  secondsLeft: number;
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  return tx("{0} min {1} s", Math.floor(seconds / 60), String(seconds % 60).padStart(2, "0"));
}

/**
 * Cuenta la sesión con los dos vencimientos del servidor (/auth/me): la inactividad, que cualquier
 * petición autenticada renueva (también el sondeo de un escaneo), y el tope absoluto, que no se puede
 * extender. Sin esos datos usa la configuración local. Avisa antes de cerrar y, al vencer, sale al login.
 * La inactividad cuenta la actividad de todas las pestañas, porque la sesión es la misma para todas (RC-311).
 */
export function IdleTimeout({ limits, userId }: { limits?: SessionLimits; userId?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const idleSpan = useRef(effectiveIdleMs(limits?.idle_timeout_seconds));
  const idleDeadline = useRef(0);
  const absoluteDeadline = useRef(Infinity);
  const lastRefresh = useRef(0);
  const warningOpen = useRef(false);
  const absoluteDismissed = useRef(false);
  const ending = useRef(false);
  const lastShared = useRef(0);
  // Hora en que salió el último /auth/me que respondió bien: su tope absoluto es el de la sesión vigente.
  const confirmedAt = useRef(0);
  // Consultas a /auth/me en curso.
  const pending = useRef(0);
  const [warning, setWarning] = useState<Warning | null>(null);

  // Sale por /auth/expirada, que borra la cookie aunque POST /auth/logout falle con la API caída (RC-225).
  const endSession = useCallback(async (notice: LoginNotice) => {
    if (ending.current) return;
    ending.current = true;
    announceEnded(sharedStore(), notice, Date.now());
    await logout();
    leaveSession(notice);
  }, []);

  // Otra pestaña ya cerró la sesión: esta solo sale, sin volver a pedir POST /auth/logout.
  const leaveFromElsewhere = useCallback((notice: string) => {
    if (ending.current) return;
    ending.current = true;
    leaveSession(loginNoticeFrom(notice));
  }, []);

  // Esta pestaña tuvo actividad (o el servidor renovó la sesión): mueve su plazo y lo comparte con las demás.
  const touch = useCallback((at: number) => {
    // Ya anunció el cierre: ninguna actividad posterior, ni la del POST /auth/logout, debe invalidar ese aviso.
    if (ending.current) return;
    idleDeadline.current = at + idleSpan.current;
    if (at - lastShared.current < SHARE_INTERVAL_MS) return;
    lastShared.current = at;
    recordActivity(sharedStore(), at);
  }, []);

  const applyLimits = useCallback((next: SessionLimits | undefined, now: number) => {
    if (!next) return;
    idleSpan.current = effectiveIdleMs(next.idle_timeout_seconds);
    absoluteDeadline.current = now + next.absolute_expires_in_seconds * 1000;
  }, []);

  // Renueva la sesión en el servidor y toma de ahí los vencimientos vigentes. Con `own` en false la pide la actividad
  // de otra pestaña: no cuenta como actividad de esta.
  const syncWithServer = useCallback(
    (own = true) => {
      const sentAt = Date.now();
      pending.current += 1;
      // Pasiva, no avisa de actividad: si no, una pestaña quieta la escribiría como suya y las quietas se renovarían
      // entre sí sin nadie delante (revisión de RC-311, regresiones 1 y 2 de la ronda 2).
      void getCurrentUser({ passive: !own })
        .then((user) => {
          if (ending.current) return;
          if (!user) {
            // El servidor ya no reconoce la sesión y no dice por qué: el mismo aviso que /auth/expirada, salvo que ya
            // venció el tope de 8 h.
            void endSession(absoluteDeadline.current <= Date.now() ? "max" : "ended");
            return;
          }
          if (userId !== undefined && user.id !== userId) {
            // Otra persona entró en otra pestaña y la cookie ya es suya: se recarga con su sesión. Sin leaveSession,
            // que borraría esa cookie, y sin mostrar más los datos de la anterior (revisión de RC-311, #11).
            ending.current = true;
            window.location.reload();
            return;
          }
          const now = Date.now();
          confirmedAt.current = Math.max(confirmedAt.current, sentAt);
          applyLimits(user.session_limits, now);
          if (own) touch(now);
        })
        .catch(() => {})
        .finally(() => {
          pending.current -= 1;
        });
    },
    [applyLimits, endSession, touch, userId],
  );

  useEffect(() => {
    const now = Date.now();
    applyLimits(limits, now);
    // Los vencimientos del render salen del servidor: confirman la sesión de esta pestaña.
    if (limits) confirmedAt.current = now;
    touch(now);

    const onActivity = () => {
      // Con el aviso de inactividad abierto, solo el botón "Continuar" mantiene la sesión.
      if (warningOpen.current) return;
      const at = Date.now();
      touch(at);
      if (at - lastRefresh.current >= SESSION_REFRESH_INTERVAL_MS) {
        lastRefresh.current = at;
        syncWithServer();
      }
    };

    // El servidor renovó la inactividad con esa petición: el portal cuenta igual que él.
    const onApiActivity = () => {
      touch(Date.now());
    };

    const tick = () => {
      if (ending.current) return;
      const at = Date.now();
      // Antes de decidir, la última actividad de cualquier pestaña: si el usuario sigue en otra, esta no cierra.
      const before = idleDeadline.current;
      idleDeadline.current = sharedIdleDeadline(before, sharedStore(), idleSpan.current, at);
      // Esa actividad puede ser de una sesión nueva: el tope absoluto y el usuario salen del servidor (#2 y #11).
      if (needsServerCheck(before, idleDeadline.current, sharedStore(), at, lastRefresh.current, SESSION_REFRESH_INTERVAL_MS)) {
        lastRefresh.current = at;
        syncWithServer(false);
      }
      const idleLeft = idleDeadline.current - at;
      const absoluteLeft = absoluteDeadline.current - at;
      // Hay actividad posterior al último /auth/me que esta confirmó, de esta o de otra pestaña: su tope vencido puede
      // ser el de una sesión anterior y POST /auth/logout borraría la nueva. No cierra hasta que /auth/me diga cuál es
      // la vigente (#2 y tiempos-1).
      if (mustConfirmBeforeMax(idleLeft, absoluteLeft, sharedStore(), at, confirmedAt.current)) {
        if (pending.current === 0 && at - lastRefresh.current >= CONFIRM_RETRY_MS) {
          lastRefresh.current = at;
          syncWithServer(false);
        }
        return;
      }
      const reason: Reason = absoluteLeft <= idleLeft ? "absolute" : "idle";
      const left = Math.min(idleLeft, absoluteLeft);
      if (left <= 0) {
        // El tope de 8 h y la inactividad dan avisos distintos en el login.
        void endSession(reason === "absolute" ? "max" : "expired");
        return;
      }
      const threshold = reason === "absolute" ? ABSOLUTE_WARNING_MS : idleWarningMs(idleSpan.current);
      const show = left <= threshold && !(reason === "absolute" && absoluteDismissed.current);
      warningOpen.current = show && reason === "idle";
      setWarning(show ? { reason, secondsLeft: Math.ceil(left / 1000) } : null);
    };

    // Lo que escriben las demás pestañas (el evento no llega a la pestaña que escribió).
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_KEY) {
        // Actividad o "Continuar" en otra pestaña: el aviso de esta se cierra sin esperar al siguiente segundo.
        tick();
      } else if (event.key === ENDED_KEY) {
        const notice = endedElsewhere(event.newValue, sharedStore(), Date.now());
        if (notice !== undefined) leaveFromElsewhere(notice);
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    window.addEventListener(API_ACTIVITY_EVENT, onApiActivity);
    window.addEventListener("storage", onStorage);
    const interval = setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.removeEventListener(API_ACTIVITY_EVENT, onApiActivity);
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [applyLimits, endSession, leaveFromElsewhere, limits, syncWithServer, touch]);

  const keepAlive = () => {
    const now = Date.now();
    warningOpen.current = false;
    // Sin esperar el intervalo: las demás pestañas cierran su aviso al momento.
    lastShared.current = 0;
    touch(now);
    lastRefresh.current = now;
    setWarning(null);
    syncWithServer();
  };

  if (warning === null) return null;
  const isAbsolute = warning.reason === "absolute";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-xl bg-lt-surface p-6 shadow-lg"
      >
        <Clock aria-hidden="true" className="h-6 w-6 text-lt-muted" />
        <h2 id={titleId} className="mt-4 text-lg font-bold text-lt-text">
          {isAbsolute ? tx("Tu sesión está por llegar a su límite") : tx("¿Sigues ahí?")}
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-lt-muted">
          {isAbsolute
            ? tx("Por seguridad, la sesión dura un máximo de 8 horas. Guarda tu trabajo: se cerrará en ")
            : tx("Por seguridad, tu sesión se cerrará por inactividad en ")}
          <strong className="tabular-nums text-lt-text">{formatWait(warning.secondsLeft)}</strong>
          {isAbsolute ? tx(" y tendrás que iniciar sesión de nuevo.") : "."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void endSession("logout")}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-lt-muted hover:bg-lt-raised"
          >
            {tx("Cerrar sesión")}</button>
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
            className="rounded-lg bg-lt-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-lt-indigo/90"
          >
            {isAbsolute ? tx("Entendido") : tx("Continuar sesión")}
          </button>
        </div>
      </div>
    </div>
  );
}
