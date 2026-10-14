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

## Usuarios de prueba

Se entra con el **correo**. Todas las cuentas usan la contraseña `Cirdan1234` y el código MFA `123456`.

| Correo                 | Rol           | Qué ve |
|------------------------|---------------|--------|
| `analista@cirdan.test` | Analista      | Dashboard, Dominios y autorización (solo la lista), Detalle de dominio, Hallazgos y Reportes e histórico |
| `gerente@cirdan.test`  | Gerente       | Dashboard, Dominios, Detalle de dominio y Reportes e histórico, solo lectura |
| `admin@cirdan.test`    | Administrador | Todo lo anterior, más registrar dominios y verificar el TXT, Políticas de alerta y la sección Administración (Resumen, Usuarios y roles, Acceso API, Webhooks y Bitácora) |

Código de recuperación de contraseña: `1234`. Una contraseña nueva necesita al menos 12 caracteres. Las cuentas creadas en `/signup` solo viven en la memoria del navegador y se pierden al recargar la página.

## Estructura

El portal se llama **Lowtide**: el acceso (login, MFA, registro y recuperación) es claro y el panel es oscuro. Todo el texto está en español.

- `src/app/(auth)`: login con correo, MFA, registro y recuperación de contraseña.
- `src/app/(dashboard)/dashboard`: el panel. Cada página llama primero a `checkSectionAccess()` (`src/components/dashboard/SectionAccess.tsx`) y después pide sus datos a `src/services/`.
  - `page.tsx` Dashboard · `dominios/` Dominios y autorización · `detalle/` abre el dominio con más riesgo · `dominios/[fqdn]/` Detalle de dominio · `hallazgos/` · `historico/` Reportes e histórico · `alertas/` Políticas de alerta · `admin/` Resumen, `usuarios/`, `api/`, `webhooks/` y `bitacora/` · `perfil/`.
- `src/config/permissions.ts`: menú de cada rol (`ROLE_NAVIGATION`), secciones permitidas y acciones (`can()`, por ejemplo registrar dominios solo Admin).
- `src/components/ui/`: piezas del tema oscuro (tarjetas, etiquetas, botones, campos, barras y modal). `tones.ts` tiene los colores de severidades y bandas.
- `src/components/screens/<sección>/`: las pantallas, que reciben sus datos por props.
- `src/components/auth/` y `TextInput`, `Button`, `CodeInput`: piezas del acceso claro.
- `src/services/`: llamadas a la API (simuladas por ahora). Las pantallas solo piden datos a estas funciones, así que conectar la API cambia los servicios y no las pantallas. Cada función indica con un TODO su endpoint de `/api/v1`.
- `src/mocks/api/`: datos simulados. `contrato.ts` sale de los JSON del contrato #21 de BackKL (`docs/api_v1/`) más los campos marcados «Propuesto» en `src/types/api.ts`; `provisional.ts` trae lo que aún no está en el contrato.
- `src/types/api.ts`: tipos de la API v1. «Provisional» = endpoint que todavía no está en el contrato; «Propuesto» = campo nuevo que hay que agregar en BackKL.
- `src/config/labels.ts`: nombres en español de todos los códigos de la API.
- `src/lib`: formato de fechas, validación, fuerza de contraseña y la sesión simulada en `session/` (cookie `cirdan_session`, cierre por 15 min de inactividad).
- `src/proxy.ts`: redirecciones según sesión (en Next 16 reemplaza a `middleware.ts`).
