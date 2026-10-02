"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, SESSION_REFRESH_INTERVAL_MS } from "@/config/session";
import { readSessionCookie, refreshSessionCookie } from "@/lib/session/client";
import { logout } from "@/services/authService";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Cierra la sesión tras IDLE_TIMEOUT_MS sin actividad y avisa IDLE_WARNING_MS antes.
 * TODO: conectar con backend — FastAPI también debe expirar la sesión en servidor
 * (TTL en Valkey); este temporizador es solo la parte de la interfaz.
 */
export function IdleTimeout() {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const lastActivity = useRef(0);
  const lastRefresh = useRef(0);
  const warningOpen = useRef(false);
  const ending = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

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

  useEffect(() => {
    lastActivity.current = Date.now();

    const onActivity = () => {
      // Con el aviso abierto, solo el botón "Continuar" mantiene la sesión.
      if (warningOpen.current) return;
      const now = Date.now();
      lastActivity.current = now;
      if (now - lastRefresh.current >= SESSION_REFRESH_INTERVAL_MS) {
        lastRefresh.current = now;
        refreshSessionCookie();
      }
    };

    const tick = () => {
      // La sesión se cerró en otra pestaña o la cookie ya expiró.
      if (!readSessionCookie()) {
        void endSession("/login");
        return;
      }
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_TIMEOUT_MS) {
        void endSession("/login?notice=expired");
      } else if (idle >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) {
        warningOpen.current = true;
        setSecondsLeft(Math.ceil((IDLE_TIMEOUT_MS - idle) / 1000));
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    const interval = setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      clearInterval(interval);
    };
  }, [endSession]);

  const keepAlive = () => {
    const now = Date.now();
    warningOpen.current = false;
    lastActivity.current = now;
    lastRefresh.current = now;
    refreshSessionCookie();
    setSecondsLeft(null);
  };

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cirdan-950/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cirdan-50">
          <Clock aria-hidden="true" className="h-6 w-6 text-cirdan-700" />
        </div>
        <h2 id={titleId} className="mt-4 text-lg font-bold text-slate-900">
          ¿Sigues ahí?
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-slate-600">
          Por seguridad, tu sesión se cerrará por inactividad en{" "}
          <strong className="tabular-nums text-slate-900">{secondsLeft} s</strong>.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void endSession("/login?notice=logout")}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            autoFocus
            onClick={keepAlive}
            className="rounded-lg bg-cirdan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cirdan-600"
          >
            Continuar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
