# Cirdan · Frontend (FrontKL)

Frontend de Cirdan en Next.js 16 (App Router, TypeScript, Tailwind CSS v4).
Por ahora funciona con **datos simulados**; la capa `src/services/` está lista para
conectarse a la API de FastAPI (busca `TODO: conectar con backend`).

## Arranque

```bash
cp .env.example .env.local   # opcional
npm install
npm run dev                  # http://localhost:3000
```

## Usuarios de prueba

| Usuario    | Contraseña   | MFA      | Rol      |
|------------|--------------|----------|----------|
| `analista` | `Cirdan1234` | `123456` | Analista |
| `gerente`  | `Cirdan1234` | `123456` | Gerente  |
| `admin`    | `Cirdan1234` | `123456` | Admin    |

Código de recuperación de contraseña: `1234`.

## Estructura

- `src/app/(auth)` – login, MFA, registro y recuperación de contraseña.
- `src/app/(dashboard)` – app protegida; navegación y permisos en `src/config/permissions.ts`.
- `src/proxy.ts` – redirecciones según sesión (en Next 16 reemplaza a `middleware.ts`).
- `src/services` – llamadas a la API (mock). `src/lib/apiClient.ts` – cliente HTTP base.
- `src/config/session.ts` – cierre de sesión por 15 min de inactividad
  (`NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` permite acortarlo en desarrollo).
