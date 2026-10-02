import { PASSWORD_MIN_LENGTH } from "./validation";

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthScore;
  label: string;
  hint: string;
}

// Muestra mínima de contraseñas filtradas. TODO: conectar con backend — FastAPI
// debería validar contra la lista de HIBP Pwned Passwords (k-anonymity), ASVS 2.1.7.
const COMMON_PASSWORDS = new Set([
  "123456789012",
  "password1234",
  "passwordpassword",
  "qwertyuiop12",
  "contraseña123",
  "contrasena123",
  "iloveyou1234",
  "adminadmin123",
  "cirdan123456",
]);

const LABELS: Record<StrengthScore, string> = {
  0: "Muy corta",
  1: "Débil",
  2: "Aceptable",
  3: "Buena",
  4: "Fuerte",
};

export function evaluatePassword(password: string, context: string[] = []): PasswordStrength {
  const length = [...password].length;

  if (length < PASSWORD_MIN_LENGTH) {
    return { score: 0, label: LABELS[0], hint: `Faltan ${PASSWORD_MIN_LENGTH - length} caracteres.` };
  }

  const lower = password.toLowerCase();
  const isWeak =
    COMMON_PASSWORDS.has(lower) ||
    /^(.)\1+$/.test(password) ||
    context.some((value) => value.length >= 3 && lower.includes(value.toLowerCase()));

  if (isWeak) {
    return { score: 1, label: LABELS[1], hint: "Evita contraseñas comunes, repetidas o con tus datos." };
  }

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  let score = 2;
  if (length >= 16 || variety >= 3) score++;
  if (length >= 20 || (length >= 16 && variety >= 3)) score++;

  const clamped = Math.min(score, 4) as StrengthScore;
  return {
    score: clamped,
    label: LABELS[clamped],
    hint: clamped < 4 ? "Una frase larga con espacios es fácil de recordar y difícil de adivinar." : "",
  };
}
