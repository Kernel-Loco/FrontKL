# LowTide · Frontend (FrontKL)

Frontend de LowTide en Next.js 16 (App Router, TypeScript, Tailwind CSS v4).
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

## Inicio de sesión (con el backend)

El login es real: lo hace FastAPI (BackKL, #25). Antes de entrar al portal, levanta el backend con `docker compose up -d` en BackKL (con `DEMO_ACCOUNTS=true` en su `.env`). El portal reenvía `/api/v1/*` a la API (`next.config.ts`, variable `API_INTERNAL_URL`), así que la cookie de sesión `lt_session` (httpOnly) es del mismo sitio y JavaScript nunca la ve. **Usa `npm run dev` en el puerto 3000**, porque la API solo acepta escrituras de los orígenes de `ALLOWED_ORIGINS`.

| Correo | Rol en el portal | Qué ve |
|---|---|---|
| `jordan.tate@acme-demo.mx` | Analista | Dashboard, Dominios y autorización (solo la lista), Detalle de dominio, Hallazgos y Reportes e histórico |
| `maya.reed@acme-demo.mx` | Gerente | Dashboard, Dominios, Detalle de dominio y Reportes e histórico, solo lectura |
| `alex.morgan@acme-demo.mx` | Administrador | Todo lo anterior, más registrar dominios y verificar el TXT, Políticas de alerta y la sección Administración |

Contraseña: `Lowtide-Demo-2026`. **Cómo pasar el MFA** (claves para la app autenticadora o el comando que da el código) y qué hacer si algo falla: [guía de cuentas de prueba en BackKL](https://github.com/Kernel-Loco/BackKL/blob/dev/docs/cuentas_de_prueba.md) (`docs/cuentas_de_prueba.md`).

La sesión expira a los 15 min sin actividad (aviso un minuto antes) y a las 8 h como máximo. El registro abierto y la recuperación por correo todavía no tienen backend: esas pantallas lo dicen al enviarlas.

Lo demás (dominios, hallazgos, score, reportes, administración) sigue con **datos simulados** de `src/mocks/api/` hasta conectar la API v1 (RC-17).

## Estructura

El portal se llama **LowTide**: el acceso (login, MFA, registro y recuperación) es claro, y el panel es oscuro con un botón para cambiar a modo claro (`ThemeToggle`). Todo el texto está en español.

- `src/app/(auth)`: login con correo, MFA, registro y recuperación de contraseña.
- `src/app/(dashboard)/dashboard`: el panel. Cada página llama primero a `checkSectionAccess()` (`src/components/dashboard/SectionAccess.tsx`) y después pide sus datos a `src/services/`.
  - `page.tsx` Dashboard · `dominios/` Dominios y autorización · `detalle/` abre el dominio con más riesgo · `dominios/[fqdn]/` Detalle de dominio · `hallazgos/` · `historico/` Reportes e histórico · `alertas/` Políticas de alerta · `admin/` Resumen, `usuarios/`, `api/`, `webhooks/` y `bitacora/` · `perfil/`.
- `src/config/permissions.ts`: menú de cada rol (`ROLE_NAVIGATION`), secciones permitidas y acciones (`can()`, por ejemplo registrar dominios solo Admin).
- `src/components/ui/`: piezas del tema oscuro (tarjetas, etiquetas, botones, campos, barras y modal). `tones.ts` tiene los colores de severidades y bandas.
- `src/components/screens/<sección>/`: las pantallas, que reciben sus datos por props.
- `src/components/auth/` y `TextInput`, `Button`, `CodeInput`: piezas del acceso claro.
- `src/services/`: llamadas a la API. `authService.ts` ya habla con FastAPI; los demás siguen simulados. Las pantallas solo piden datos a estas funciones, así que conectar la API cambia los servicios y no las pantallas. Cada función indica con un TODO su endpoint de `/api/v1`.
- `src/mocks/api/`: datos simulados. `contrato.ts` sale de los JSON del contrato #21 de BackKL (`docs/api_v1/`) más los campos marcados «Propuesto» en `src/types/api.ts`; `provisional.ts` trae lo que aún no está en el contrato.
- `src/types/api.ts`: tipos de la API v1. «Provisional» = endpoint que todavía no está en el contrato; «Propuesto» = campo nuevo que hay que agregar en BackKL.
- `src/config/labels.ts`: nombres en español de todos los códigos de la API.
- `src/lib`: formato de fechas, validación y fuerza de contraseña. En `session/`, la sesión real: `server.ts` la valida con FastAPI (`GET /auth/me`) en cada página y `shared.ts` traduce el rol de la base (`analyst`, `manager`, `admin`) al del portal.
- `src/app/auth/expirada`: borra una cookie que FastAPI ya no reconoce antes de volver al login.
- `src/proxy.ts`: redirecciones según sesión (en Next 16 reemplaza a `middleware.ts`).
