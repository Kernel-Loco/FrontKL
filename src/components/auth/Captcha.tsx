"use client";

import { useEffect, useRef } from "react";
import type {} from "altcha/types/react";
import { CAPTCHA_CONFIG, CAPTCHA_LANGUAGE, CAPTCHA_STRINGS, CAPTCHA_URL, captchaPayload } from "@/lib/captcha";

type Widget = HTMLElement & {
  configure: (config: object) => Promise<void>;
  reset: () => void;
  verify: () => Promise<unknown>;
};

interface CaptchaProps {
  /** El resultado listo para mandarlo a /login, o null mientras no haya uno válido. */
  onChange: (payload: string | null) => void;
  /** Cada login gasta su captcha en la API: cuando este número cambia, se descarta el actual y se resuelve otro. */
  renew: number;
}

/**
 * Widget ALTCHA del login (RC-154). Empieza a resolver en cuanto la persona entra a un campo del formulario
 * (auto="onfocus"), así que al terminar de escribir la contraseña suele estar listo. El paquete toca `window`
 * al cargarse: se importa en el navegador, nunca en el servidor.
 */
export function Captcha({ onChange, renew }: CaptchaProps) {
  const widget = useRef<Widget>(null);
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });

  useEffect(() => {
    const node = widget.current;
    if (!node) return;
    let cancelled = false;
    const onVerified = (event: Event) =>
      report.current(captchaPayload((event as CustomEvent<{ payload?: string }>).detail?.payload));
    const onState = (event: Event) => {
      if ((event as CustomEvent<{ state?: string }>).detail?.state !== "verified") report.current(null);
    };
    node.addEventListener("verified", onVerified);
    node.addEventListener("statechange", onState);
    void (async () => {
      await import("altcha");
      if (cancelled) return;
      globalThis.$altcha.i18n.set(CAPTCHA_LANGUAGE, { ...CAPTCHA_STRINGS });
      await customElements.whenDefined("altcha-widget");
      if (!cancelled) await node.configure(CAPTCHA_CONFIG);
    })();
    return () => {
      cancelled = true;
      node.removeEventListener("verified", onVerified);
      node.removeEventListener("statechange", onState);
    };
  }, []);

  useEffect(() => {
    const node = widget.current;
    if (renew === 0 || typeof node?.reset !== "function") return;
    report.current(null);
    node.reset();
    void node.verify();
  }, [renew]);

  return (
    <div className="min-h-[72px]">
      <altcha-widget
        ref={widget}
        challenge={CAPTCHA_URL}
        language={CAPTCHA_LANGUAGE}
        auto="onfocus"
        type="checkbox"
        suppressHydrationWarning
      />
    </div>
  );
}
