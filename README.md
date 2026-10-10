# Cirdan · Frontend (FrontKL)

Frontend de Cirdan en Next.js 16 (App Router, TypeScript, Tailwind CSS v4).
Por ahora funciona con **datos simulados**; la capa `src/services/` está lista para
conectarse a la API de FastAPI (busca `TODO: conectar con backend`).

El backend (base de datos, API y recolectores OSINT) está en [BackKL](https://github.com/Kernel-Loco/BackKL).

## Requisitos

- Node.js 20.9 o más reciente, que es lo que pide Next 16 (el equipo usa Node 22). Con Node 18 no arranca.
- Internet la primera vez que se compila, para descargar las fuentes Inter y Montserrat de Google Fonts.

## Arranque

```bash
cp .env.example .env.local   # opcional
npm ci                       # instala las versiones exactas de package-lock.json
npm run dev                  # http://localhost:3000
```

`npm run build` compila la versión de producción y `npm run lint` revisa el código con ESLint.

## Usuarios de prueba

| Usuario    | Correo                | Contraseña   | MFA      | Rol      |
|------------|-----------------------|--------------|----------|----------|
| `analista` | `analista@cirdan.test` | `Cirdan1234` | `123456` | Analista |
| `gerente`  | `gerente@cirdan.test`  | `Cirdan1234` | `123456` | Gerente  |
| `admin`    | `admin@cirdan.test`    | `Cirdan1234` | `123456` | Admin    |

Código de recuperación de contraseña: `1234`. La recuperación pide el correo de la tabla. Una contraseña nueva, al registrarse o al recuperarla, necesita al menos 12 caracteres. Las cuentas creadas en `/signup` solo viven en la memoria del navegador y se pierden al recargar la página.

## Estructura

- `src/app/(auth)`: login, MFA, registro y recuperación de contraseña.
- `src/app/(dashboard)`: app protegida. `/dashboard` es el Resumen, con datos simulados. Las demás secciones (`/dashboard/activos`, `hallazgos`, `escaneos`, `score-de-riesgo`, `reportes`, `usuarios` y `configuracion`) todavía muestran «en construcción», y cada rol solo entra a las que le permite `src/config/permissions.ts`.
- `src/proxy.ts`: redirecciones según sesión (en Next 16 reemplaza a `middleware.ts`).
- `src/components`: componentes de la interfaz. Hay sueltos (botones, campos, encabezado y barra lateral) y carpetas para los del login (`auth/`, con sus formularios en `auth/forms/`) y los del panel (`dashboard/`).
- `src/services`: llamadas a la API (simuladas por ahora). `src/lib/apiClient.ts` es el cliente HTTP base.
- `src/mocks`: datos simulados, con los usuarios de prueba (`users.ts`) y los hallazgos del Resumen (`findings.ts`).
- `src/lib`: utilidades de formato, validación de formularios y fuerza de contraseña, y la sesión simulada en `session/`, que se guarda en la cookie `cirdan_session`.
- `src/hooks`: `useFlowState`, que lee el avance de los flujos de varios pasos (MFA y recuperación) guardado en sessionStorage.
- `src/types`: tipos de TypeScript compartidos de usuarios, sesión y hallazgos.
- `src/config`: navegación y permisos por rol (`permissions.ts`), nombres de severidad y fuente de los hallazgos (`labels.ts`) y sesión (`session.ts`), con cierre por 15 min de inactividad (`NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` permite acortarlo en desarrollo).
