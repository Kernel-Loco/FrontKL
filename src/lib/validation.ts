import { z } from "zod";

// Política de contraseñas alineada a OWASP ASVS V2.1: longitud mínima de 12,
// se permiten espacios y cualquier carácter, sin reglas de composición.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const required = (message: string) => z.string().trim().min(1, message);

export const passwordSchema = z
  .string()
  .min(1, "La contraseña es obligatoria.")
  .min(PASSWORD_MIN_LENGTH, `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `Usa como máximo ${PASSWORD_MAX_LENGTH} caracteres.`);

const emailSchema = z
  .string()
  .trim()
  .min(1, "El e-mail es obligatorio.")
  .pipe(z.email("Ingresa un e-mail válido."));

// En login no se valida la política: solo se exige que haya algo que enviar.
export const loginSchema = z.object({
  username: required("El usuario es obligatorio."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const signUpSchema = z
  .object({
    username: required("El usuario es obligatorio.")
      .min(3, "Usa al menos 3 caracteres.")
      .max(32, "Usa como máximo 32 caracteres.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo."),
    full_name: required("El nombre es obligatorio.").max(100, "Usa como máximo 100 caracteres."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
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
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
