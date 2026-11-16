import { z } from "zod";

// Política de contraseñas alineada a OWASP ASVS V2.1: longitud mínima de 12,
// se permiten espacios y cualquier carácter, sin reglas de composición.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(1, "La contraseña es obligatoria.")
  .min(PASSWORD_MIN_LENGTH, `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `Usa como máximo ${PASSWORD_MAX_LENGTH} caracteres.`);

const emailSchema = z
  .string()
  .trim()
  .min(1, "El correo es obligatorio.")
  .pipe(z.email("Ingresa un correo válido."));

// En login no se valida la política: solo se exige que haya algo que enviar.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
