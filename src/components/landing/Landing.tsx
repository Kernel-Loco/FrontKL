import Link from "next/link";
import { Barlow_Condensed } from "next/font/google";
import { ArrowRight, ArrowUpRight, FileSignature, ScanSearch, ShieldCheck, Waves } from "lucide-react";
import { Logo } from "@/components/Logo";

// Página de inicio antes del login (RC-379). Sigue las piezas de marca de LowTide: carbón #171618, el océano, titulares
// condensados en mayúsculas y la barra oscura con el logo. Es la imagen inicial del producto: no pide sesión ni datos.
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });

const INK = "#171618";
const BLUE = "#5170ff";

const PILARES = [
  { titulo: "Dominios e infraestructura", texto: "Subdominios, certificados, registros DNS, IP y servicios que tu empresa deja a la vista en internet." },
  { titulo: "Identidad digital", texto: "Correos del dominio en brechas conocidas y perfiles públicos ligados a tu organización." },
  { titulo: "Servicios expuestos", texto: "Puertos, versiones y tecnologías publicadas, cruzadas con vulnerabilidades que se explotan hoy." },
  { titulo: "Fugas de datos", texto: "Secretos y correos en repositorios públicos, documentación de APIs y almacenamiento abierto." },
];

const PASOS = [
  { icon: FileSignature, titulo: "Autoriza", texto: "Tu empresa firma la carta de autorización y publica un registro TXT. Sin eso, LowTide no analiza el dominio." },
  { icon: ScanSearch, titulo: "Escanea", texto: "LowTide consulta fuentes públicas de forma pasiva: no ataca, no prueba contraseñas, no entra a tus sistemas." },
  { icon: Waves, titulo: "Remedia", texto: "Recibes un score de riesgo explicado, un plan de acción ordenado por impacto y alertas cuando algo cambia." },
];

/** Vista ilustrativa del portal (no son datos reales): la idea del producto en una sola imagen. */
function VistaPortal() {
  const barras = [
    { etiqueta: "Infraestructura", partes: [[2, "#338ced"], [1, "#e76624"]] },
    { etiqueta: "Identidad digital", partes: [[1, "#00a888"]] },
    { etiqueta: "Configuración", partes: [[2, "#338ced"], [1, "#d28e05"], [1, "#e24d8b"]] },
    { etiqueta: "Fugas de datos", partes: [[1, "#e76624"]] },
  ] as const;
  return (
    <figure className="mx-auto w-full max-w-5xl">
      <div aria-hidden="true" className="overflow-hidden rounded-2xl bg-[#0e0e10] shadow-[0_40px_120px_-40px_rgba(81,112,255,0.35)] ring-1 ring-white/10">
        <div className="flex">
          <div className="hidden w-48 shrink-0 flex-col gap-1 bg-[#0e0e10] p-4 sm:flex">
            <Logo className="mb-5 scale-75 origin-left" />
            {["Dashboard", "Dominios", "Activos", "Hallazgos", "Reportes", "Plan de acción"].map((item, i) => (
              <span key={item} className={`rounded-md px-2.5 py-1.5 text-[11px] ${i === 0 ? "bg-white/10 font-semibold text-white" : "text-white/50"}`}>
                {item}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-3 bg-[#121214] p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Riesgo promedio", "38", "#d28e05"],
                ["Hallazgos críticos", "2", "#eb6263"],
                ["Dominios monitoreados", "5", "#ffffff"],
              ].map(([label, valor, color]) => (
                <div key={label} className="rounded-lg bg-[#171618] p-3">
                  <p className="text-[10px] text-white/50">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{valor}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-[#171618] p-4">
              <p className="mb-3 text-[11px] font-semibold text-white/80">Hallazgos abiertos por categoría</p>
              <div className="space-y-2.5">
                {barras.map(({ etiqueta, partes }) => {
                  const total = partes.reduce((s, [n]) => s + n, 0);
                  return (
                    <div key={etiqueta} className="grid grid-cols-[7rem_1fr_1rem] items-center gap-3">
                      <span className="truncate text-[10px] text-white/60">{etiqueta}</span>
                      <span className="flex h-2 gap-0.5" style={{ width: `${(total / 4) * 100}%` }}>
                        {partes.map(([n, c], i) => (
                          <span key={i} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: n, backgroundColor: c }} />
                        ))}
                      </span>
                      <span className="text-right text-[10px] tabular-nums text-white/70">{total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-white/40">Vista ilustrativa del portal, con datos de ejemplo.</figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <div className={`${display.variable} min-h-dvh text-white`} style={{ backgroundColor: INK }}>
      <a href="#contenido" className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-saturate-150" style={{ backgroundColor: `${INK}f2` }}>
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-8">
          <Link href="/" aria-label="LowTide, inicio" className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label="Secciones" className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#que-hace" className="hover:text-white">Qué hace</a>
            <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
            <Link href="/seguridad" className="hover:text-white">Seguridad</Link>
          </nav>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            style={{ backgroundColor: BLUE }}
          >
            Iniciar sesión
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main id="contenido">
        {/* Portada: el océano con el titular en negro, como las piezas de marca. */}
        <section aria-labelledby="titulo" className="relative isolate overflow-hidden bg-[#cfe3e8]">
          <video aria-hidden="true" autoPlay muted loop playsInline preload="auto" className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden">
            <source src="/auth/oceano.mp4" type="video/mp4" />
          </video>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-white/75 via-white/45 to-white/0" />
          <div className="mx-auto flex min-h-[78dvh] w-full max-w-7xl flex-col justify-center px-4 py-20 sm:px-8">
            <h1
              id="titulo"
              className="max-w-4xl font-[family-name:var(--font-display)] text-[3.4rem] font-extrabold uppercase leading-[0.88] tracking-[-0.01em] text-black sm:text-7xl lg:text-[7.5rem]"
            >
              Protege tu empresa de la marea.
              <span className="block" style={{ color: "#2f4ed8" }}>Hazlo con LowTide.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-black/75 sm:text-lg">
              Descubre lo que tu organización deja expuesto en internet antes que un atacante: dominios, servicios, credenciales filtradas y
              datos públicos, con un score de riesgo y un plan para corregirlo.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black" style={{ backgroundColor: INK }}>
                Iniciar sesión
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-black ring-1 ring-black/25 transition-colors hover:bg-white/50">
                Cómo funciona
              </a>
            </div>
          </div>
        </section>

        {/* El producto en una imagen. */}
        <section id="que-hace" aria-labelledby="que-hace-titulo" className="scroll-mt-16 px-4 pb-24 pt-24 sm:px-8">
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <h2 id="que-hace-titulo" className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
              <span className="block text-white/35">Conoce lo que expones</span>
              <span className="block">antes que un atacante.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-white/65">
              LowTide junta en un solo lugar lo que cualquiera puede ver de tu empresa desde afuera y lo explica para cada rol: el detalle técnico
              para quien corrige y el riesgo de negocio para quien decide.
            </p>
          </div>
          <VistaPortal />
        </section>

        {/* Lo que revisa. */}
        <section aria-labelledby="pilares-titulo" className="border-t border-white/10 px-4 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 id="pilares-titulo" className="mb-12 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none sm:text-5xl">
              Cuatro frentes, un solo score.
            </h2>
            <ol className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {PILARES.map(({ titulo, texto }, i) => (
                <li key={titulo} className="flex flex-col p-7" style={{ backgroundColor: INK }}>
                  <span className="mb-10 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none" style={{ color: BLUE }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Cómo funciona. */}
        <section id="como-funciona" aria-labelledby="como-titulo" className="scroll-mt-16 bg-[#f1f0ec] px-4 py-24 text-black sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <h2 id="como-titulo" className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-[0.92] sm:text-6xl">
                Sin tocar tus sistemas.
                <span className="block" style={{ color: "#2f4ed8" }}>Solo con tu permiso.</span>
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-black/70">
                LowTide trabaja como lo haría un atacante paciente, pero del lado correcto: mira desde afuera, con fuentes públicas y servicios con
                licencia, y solo en los dominios que tu empresa autorizó por escrito.
              </p>
            </div>
            <ol className="space-y-4">
              {PASOS.map(({ icon: Icon, titulo, texto }, i) => (
                <li key={titulo} className="flex gap-5 rounded-2xl bg-white p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: INK }}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">
                      <span className="mr-2 text-black/35 tabular-nums">{i + 1}.</span>
                      {titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-black/65">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Cierre. */}
        <section aria-labelledby="cierre-titulo" className="px-4 py-28 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="cierre-titulo" className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
              Protege tu empresa de lo inesperado.
              <span className="block" style={{ color: BLUE }}>Hazlo con LowTide.</span>
            </h2>
            <div className="flex flex-col items-start gap-4">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:brightness-110" style={{ backgroundColor: BLUE }}>
                Iniciar sesión
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                El acceso es por invitación de un Administrador de tu empresa.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-white/50 sm:px-8">
          <Logo className="scale-90 origin-left" />
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacidad" className="hover:text-white">Aviso de privacidad</Link>
            <Link href="/terminos" className="hover:text-white">Términos de uso</Link>
            <Link href="/seguridad" className="hover:text-white">Cómo cuida LowTide tus datos</Link>
          </nav>
          <span>Proyecto académico del equipo Kernel Loco · Tec de Monterrey</span>
        </div>
      </footer>
    </div>
  );
}
