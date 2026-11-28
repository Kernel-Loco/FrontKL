// Lado servidor de tx() (RC-374): lee la cookie del idioma de la petición en curso, de forma síncrona, desde el
// almacenamiento por petición de Next. Lo carga el layout raíz; queda registrado para todo el proceso (componentes de
// servidor y el pintado inicial de los de cliente). Sin petición en curso (o si Next cambia ese almacenamiento) da
// undefined y tx() se queda en español.
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { LOCALE_COOKIE } from "./config";

interface CookieStore {
  cookies?: { get(name: string): { value: string } | undefined };
}

(globalThis as typeof globalThis & { __lowtideLocale?: () => string | undefined }).__lowtideLocale = () => {
  try {
    return (workUnitAsyncStorage.getStore() as CookieStore | undefined)?.cookies?.get(LOCALE_COOKIE)?.value;
  } catch {
    return undefined;
  }
};
