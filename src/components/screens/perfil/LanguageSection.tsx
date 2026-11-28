"use client";

import { useState } from "react";
import { LOCALE_NAMES, LOCALES, saveLocaleAndReload } from "@/i18n/config";
import { activeLocale, tx } from "@/i18n/tx";

/**
 * Idioma de todo el portal (RC-374). Se guarda un año en una cookie de este navegador y la página se recarga: así el
 * servidor la pinta completa con el idioma nuevo, también <html lang> y los componentes de cliente.
 */
export function LanguageSection() {
  const current = activeLocale();
  const [pending, setPending] = useState(false);

  const choose = (locale: (typeof LOCALES)[number]) => {
    if (locale === current) return;
    setPending(true);
    saveLocaleAndReload(locale);
  };

  return (
    <div aria-busy={pending || undefined}>
      <p className="mb-4 text-sm text-lt-muted">{tx("El idioma de todo el portal en este navegador.")}</p>
      <div role="radiogroup" aria-label={tx("Idioma")} className="inline-flex rounded-lg bg-lt-raised p-0.5">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <button
              key={locale}
              type="button"
              role="radio"
              aria-checked={active}
              lang={locale}
              disabled={pending}
              onClick={() => choose(locale)}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                active ? "bg-lt-surface font-semibold text-lt-text shadow-sm" : "text-lt-muted hover:text-lt-text"
              }`}
            >
              {LOCALE_NAMES[locale]}
            </button>
          );
        })}
      </div>
      {pending && <p role="status" className="mt-3 text-xs text-lt-muted">{tx("Cambiando el idioma…")}</p>}
    </div>
  );
}
