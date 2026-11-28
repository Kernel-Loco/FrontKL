// Idiomas del portal (RC-374). El elegido vive en una cookie del navegador, no en la URL: las rutas no cambian.
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "lowtide-lang";

export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English" };

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale);

/** Guarda el idioma un año en este navegador y recarga para que el servidor pinte todo en ese idioma. */
export function saveLocaleAndReload(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
