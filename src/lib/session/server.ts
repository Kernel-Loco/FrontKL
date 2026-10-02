import { cookies } from "next/headers";
import type { Session } from "@/types";
import { parseSession, SESSION_COOKIE } from "./shared";

// TODO: conectar con backend — con la cookie httpOnly real, el servidor debe
// validar la sesión con FastAPI (GET /auth/me reenviando la cookie) en vez de
// confiar en su contenido.
export async function getServerSession(): Promise<Session | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}
