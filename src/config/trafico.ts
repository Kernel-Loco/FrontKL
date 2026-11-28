import { localized } from "@/i18n/tx";
// Textos de la sección 'Tráfico de LowTide' de la página Seguridad. El User-Agent de LowTide liga a esta página,
// que dice qué es LowTide y a quién escribir (BackKL, constante AGENTE de los recolectores y sección 9 de la carta).
// Si el User-Agent o el ritmo cambian allá, cambian aquí.

export const TRAFICO = localized({
  id: "trafico",
  titulo: "Tráfico de LowTide",
  agente: "lowtide-osint/<versión> (+https://lowtidesec.com/seguridad)",
  queEs:
    "Este es el User-Agent de LowTide, el servicio académico del equipo Kernel Loco que descubre lo que una empresa expone en internet. Cualquiera puede copiar un User-Agent: para confirmar que una petición es de LowTide, compara la IP de origen con la que dice la sección 9 de la carta de autorización de tu empresa, o escríbenos.",
  cuando:
    "LowTide solo analiza un dominio cuya empresa firmó una carta de autorización vigente y publicó su registro TXT de verificación. Casi todo sale de fuentes públicas. A los sitios del dominio solo les hace las peticiones que autoriza la carta, como visitas web normales: una a la vez por sitio, también entre análisis distintos, salvo que la base de datos de LowTide se reinicie a media petición. Dentro de cada análisis deja una pausa de 1 segundo antes de cada petición, salvo la primera, y no pasa del tope por análisis que dice la carta.",
  contactoAntes: "Si ese tráfico no corresponde a una carta de tu empresa, o si quieres que se detenga, escribe a ",
  correo: "seguridad@lowtidesec.com",
  contactoDespues:
    " con el dominio, la IP de origen, la fecha y la hora que ves en tus registros. El equipo lo revisa y detiene el análisis si no corresponde a una carta o si lo pide el contacto de tu empresa que nombra la carta. El servicio es académico y no tiene un horario de atención garantizado.",
  // Aviso simplificado para quien escribe a seguridad@ (sección 5.1 de la política de BackKL, art. 16).
  privacidadAntes:
    "Solo usamos tu correo y lo que mandes para revisar ese tráfico y responderte. El responsable de esos datos es [Titular por definir según el convenio Tec e IKUSI]. Para ejercer tus derechos ARCO, escribe a ",
  arco: "arco@lowtidesec.com",
  avisoAntes: ". El ",
  aviso: "aviso de privacidad integral",
  avisoRuta: "/privacidad",
  avisoDespues: " dice qué datos se tratan, quién más los recibe y cuánto se conservan.",
} as const);
