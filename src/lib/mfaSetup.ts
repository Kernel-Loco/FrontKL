// Ayudas del alta de la verificación en dos pasos del perfil (RC-154). Sin React, para probarlas con node --test.

/** El QR solo se muestra si es la imagen SVG que dibuja la API: nunca una URL que cargue algo de fuera. */
export function isQrDataUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/svg+xml");
}

/** El secreto base32 en grupos de 4, para copiarlo a mano sin perderse. */
export function groupSecret(secret: string): string {
  return (secret.replace(/[^A-Z2-7]/gi, "").toUpperCase().match(/.{1,4}/g) ?? []).join(" ");
}

/** Minutos que dura el QR, redondeados hacia arriba (la API da 600 s hoy). */
export function minutesLeft(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

/** Errores del alta que obligan a pedir un QR nuevo: el anterior venció, gastó sus 5 intentos o ya no hace falta. */
export function setupMustRestart(status: number, message: string): boolean {
  return status === 409 || (status === 400 && /venció|Empieza de nuevo/.test(message));
}
