// Inactividad compartida entre las pestañas del portal (RC-311, hallazgo alto #1 de la revisión tardía del PR 55).
// La sesión del servidor es una sola para todas las pestañas, y POST /auth/logout la borra para todas. Antes cada
// pestaña contaba su plazo con su propia actividad, así que una pestaña quieta cerraba la sesión mientras el usuario
// trabajaba en otra. Ahora la última actividad de cualquier pestaña queda en localStorage (solo la hora, nunca el
// usuario ni la cookie) y cada pestaña la vuelve a leer en cada segundo de su contador, así que una pestaña en segundo
// plano, con los temporizadores frenados o congelados por el navegador, también la ve antes de decidir el cierre.
// Sin localStorage (bloqueado o lleno), cada pestaña sigue contando sola, como antes.
// Sin imports de valores, para que las pruebas de node lo carguen solo.

/** Hora (ms) de la última actividad de cualquier pestaña. */
export const ACTIVITY_KEY = "lowtide-session-activity";
/** Aviso de que una pestaña cerró la sesión: `<hora en ms>:<aviso del login>`. */
export const ENDED_KEY = "lowtide-session-ended";
/** Cada cuánto, como máximo, una pestaña escribe su actividad (mousemove llega decenas de veces por segundo). */
export const SHARE_INTERVAL_MS = 1000;
/** Cada cuánto, como máximo, repite /auth/me una pestaña que espera confirmar su sesión antes de cerrar por el tope. */
export const CONFIRM_RETRY_MS = 5000;

export type SharedStore = Pick<Storage, "getItem" | "setItem">;

// Esta pestaña ya anunció el cierre: no vuelve a escribir actividad, porque endedElsewhere toma cualquier actividad
// posterior al cierre como un nuevo inicio de sesión y las demás no saldrían (revisión de RC-311, #10, #3 y #7).
// Es del módulo, así que vale para IdleTimeout y para el Sidebar. La salida es una navegación completa y lo reinicia.
let endedHere = false;

/** localStorage si el navegador lo deja usar; null si no (modo privado que lo bloquea, sin window). */
export function sharedStore(): SharedStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Una hora en ms escrita por el portal; undefined si es cualquier otra cosa. */
export function parseTime(raw: string | null | undefined): number | undefined {
  if (!raw || !/^\d{1,15}$/.test(raw)) return undefined;
  const at = Number(raw);
  return at > 0 ? at : undefined;
}

function read(store: SharedStore | null, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Última actividad de cualquier pestaña, nunca después de `now`. Una hora más allá de `now` + SHARE_INTERVAL_MS no
 * vale: el reloj del equipo retrocedió (o la escribió otra cosa) y, recortada a `now`, mantenía viva la sesión en cada
 * lectura, mandaba /auth/me pasivo sin nadie delante y anulaba los cierres de otras pestañas (revisión de RC-311,
 * sesion-1).
 */
export function readActivity(store: SharedStore | null, now: number): number | undefined {
  const at = parseTime(read(store, ACTIVITY_KEY));
  if (at === undefined || at > now + SHARE_INTERVAL_MS) return undefined;
  return Math.min(at, now);
}

/** Guarda la actividad de esta pestaña si es más reciente que la guardada o si la guardada es de un futuro que no vale. */
export function recordActivity(store: SharedStore | null, at: number): void {
  if (!store || endedHere) return;
  const previous = parseTime(read(store, ACTIVITY_KEY));
  if (previous !== undefined && previous >= at && previous <= at + SHARE_INTERVAL_MS) return;
  try {
    store.setItem(ACTIVITY_KEY, String(Math.floor(at)));
  } catch {
    // Lleno o bloqueado: esta pestaña sigue con su propio plazo.
  }
}

/** Plazo de inactividad de esta pestaña contando la actividad de todas: el más lejano de los dos. */
export function sharedIdleDeadline(
  localDeadline: number,
  store: SharedStore | null,
  idleSpan: number,
  now: number,
): number {
  const at = readActivity(store, now);
  return at === undefined ? localDeadline : Math.max(localDeadline, at + idleSpan);
}

/**
 * Otra pestaña alargó el plazo de esta con actividad de hace menos de `refreshMs`: esta debe preguntar a /auth/me por
 * la sesión vigente, como hace con su propia actividad, para tomar su tope absoluto y saber si es del mismo usuario.
 * Sin esto, una pestaña quieta vivía con la actividad de una sesión nueva y, al llegar al tope de 8 h de la anterior,
 * llamaba a POST /auth/logout y borraba la nueva (revisión de RC-311, #2 y #11). Solo con actividad reciente, para que
 * una pestaña quieta no renueve sola la sesión en el servidor.
 */
export function needsServerCheck(
  before: number,
  after: number,
  store: SharedStore | null,
  now: number,
  lastRefresh: number,
  refreshMs: number,
): boolean {
  if (after <= before || now - lastRefresh < refreshMs) return false;
  const at = readActivity(store, now);
  return at !== undefined && now - at < refreshMs;
}

/**
 * El tope absoluto de esta pestaña venció, pero la inactividad sigue viva por actividad de otra pestaña posterior a la
 * última vez que esta confirmó la sesión con /auth/me: ese tope puede ser el de una sesión anterior y POST
 * /auth/logout borraría la nueva. Antes de cerrar por el tope toca preguntar al servidor (revisión de RC-311, #2).
 * `confirmedAt` es la hora de su último /auth/me con éxito. No se exime la actividad propia: si el /auth/me falla o
 * tarda y el usuario se mueve en esta pestaña, la suya taparía la ajena y cerraría con el tope de la sesión vieja
 * (tiempos-1). Con una sola pestaña solo cuesta un /auth/me más al llegar al tope, que da 401 y cierra con 'max'.
 */
export function mustConfirmBeforeMax(
  idleLeft: number,
  absoluteLeft: number,
  store: SharedStore | null,
  now: number,
  confirmedAt: number,
): boolean {
  if (absoluteLeft > 0 || idleLeft <= 0) return false;
  const at = readActivity(store, now);
  return at !== undefined && at > confirmedAt;
}

/** Avisa a las demás pestañas que esta cerró la sesión, con el aviso que verá en el login. */
export function announceEnded(store: SharedStore | null, notice: string, at: number): void {
  endedHere = true;
  if (!store) return;
  try {
    store.setItem(ENDED_KEY, `${Math.floor(at)}:${notice}`);
  } catch {
    // Sin aviso, las demás salen con el 401 de su siguiente petición o al vencer su plazo.
  }
}

/**
 * El aviso con el que esta pestaña debe salir porque otra cerró la sesión; undefined si no vale. No vale si después
 * del cierre hubo actividad: alguien volvió a entrar en otra pestaña y la cookie nueva es la de todas.
 */
export function endedElsewhere(raw: string | null | undefined, store: SharedStore | null, now: number): string | undefined {
  const match = /^(\d{1,15}):([a-z_]{1,32})$/.exec(raw ?? "");
  if (!match) return undefined;
  const endedAt = parseTime(match[1]);
  if (endedAt === undefined) return undefined;
  const activity = readActivity(store, now);
  if (activity !== undefined && activity > endedAt) return undefined;
  return match[2];
}
