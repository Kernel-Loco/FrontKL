// Textos de la sección 'Tráfico de LowTide' de la página Seguridad. El User-Agent de LowTide liga a esta página,
// que dice qué es LowTide y a quién escribir (BackKL, constante AGENTE de los recolectores y sección 9 de la carta).
// Si el User-Agent o el ritmo cambian allá, cambian aquí.

export const TRAFICO = {
  id: "trafico",
  titulo: "Tráfico de LowTide",
  agente: "lowtide-osint/<versión> (+https://lowtidesec.com/seguridad)",
  queEs:
    "Si ves en los registros de tu sitio peticiones con este User-Agent, son de LowTide, el servicio académico del equipo Kernel Loco que descubre lo que una empresa expone en internet.",
  cuando:
    "LowTide solo analiza un dominio cuya empresa firmó una carta de autorización vigente y publicó su registro TXT de verificación. Casi todo sale de fuentes públicas. A los sitios del dominio solo les hace las peticiones que autoriza la carta, como visitas web normales, siempre una a la vez por sitio, con una pausa de 1 segundo antes de cada una, salvo la primera, y con un tope por análisis.",
  contactoAntes: "Si ese tráfico no corresponde a una carta de tu empresa, o si quieres que se detenga, escribe a ",
  correo: "seguridad@lowtidesec.com",
  contactoDespues:
    " con el dominio, la fecha y la hora que ves en tus registros. El equipo detiene el análisis y lo revisa. El servicio es académico y no tiene un horario de atención garantizado.",
} as const;
