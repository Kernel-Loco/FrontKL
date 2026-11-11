// Único archivo con los textos de la página Seguridad (#203, RC-323). Son los del resumen de seguridad para
// clientes (#202, RC-321) del 10 de noviembre de 2026: solo los controles que ya funcionan. No se editan aquí a
// mano: si el resumen cambia, se copian de nuevo y se actualiza la huella de seguridad.test.mjs.

export interface Frontera {
  /** Etiqueta de la línea roja en el diagrama. */
  id: string;
  nombre: string;
  texto: string;
}

export interface Control {
  tema: string;
  texto: string;
}

export interface GrupoDeControles {
  /** Parte de LowTide donde actúan los controles. */
  donde: string;
  controles: Control[];
}

export const SEGURIDAD = {
  titulo: "Cómo cuida LowTide los datos de sus clientes",
  fecha: "10 de noviembre de 2026",
  intro: "LowTide descubre lo que una empresa expone en internet solo con información pública y con las peticiones que autoriza su carta, y da un score de riesgo de 0 a 100 con plan de acción. Esta página sale del modelo de amenazas del equipo y lista solo los controles que ya funcionan hoy. Lo planeado aparece punteado en el diagrama y no se cuenta aquí.",
  diagrama: {
    src: "/seguridad/arquitectura.png",
    width: 1890,
    height: 1770,
    alt: "Diagrama de arquitectura de LowTide: el navegador del usuario, el portal web, la API, el almacén de sesiones, la base de datos aislada por empresa, los recolectores, las fuentes públicas y los sitios del cliente, con cinco fronteras de confianza marcadas de TB1 a TB5. Los servicios de terceros aparecen punteados porque están planeados.",
  },
  fronterasIntro: "Son las líneas rojas del diagrama. Al cruzar cada una, LowTide deja de confiar en lo que recibe.",
  fronteras: [
    { id: "TB1", nombre: "Internet y portal", texto: "Todo lo que llega del navegador se trata como no confiable." },
    { id: "TB2", nombre: "Portal y API", texto: "La API no confía en el portal. Valida la sesión en cada petición y de ella saca la empresa." },
    { id: "TB3", nombre: "API y datos", texto: "La base de datos aísla a cada empresa aunque la API tuviera un error. El almacén de sesiones pide contraseña y ninguno de los dos queda expuesto a internet." },
    { id: "TB4", nombre: "Recolectores, fuentes públicas y sitios del cliente", texto: "Lo que responden las fuentes y los sitios es un dato externo, y se valida antes de guardarse." },
    { id: "TB5", nombre: "API y servicios de terceros", texto: "Microsoft, asistente de IA y correo. Están planeados y todavía no se conectan." },
  ] satisfies Frontera[],
  grupos: [
    {
      donde: "Navegador",
      controles: [
        {
          tema: "Sesión abierta en una computadora compartida",
          texto: "El portal avisa y cierra la sesión a los 15 minutos sin uso. Al salir, la sesión se borra en el servidor.",
        },
        {
          tema: "Cambiar el rol desde el navegador",
          texto: "Los permisos los decide el servidor en cada petición, con el rol y la empresa de la sesión. Lo que diga el navegador no cuenta.",
        },
        {
          tema: "Fórmulas escondidas en las descargas CSV",
          texto: "Los textos que vienen de sitios ajenos se neutralizan antes de exportarse, y la descarga pide sesión y autorización vigente.",
        },
      ],
    },
    {
      donde: "Portal",
      controles: [
        {
          tema: "Peticiones forzadas desde otro sitio (CSRF)",
          texto: "La cookie de sesión no viaja en peticiones de otros sitios y el servidor rechaza las escrituras que no vienen del portal.",
        },
        {
          tema: "Mezcla de datos entre usuarios",
          texto: "Cada página se arma por petición, sin caché compartida. El portal no guarda datos ni secretos, y los códigos temporales del inicio de sesión viven solo en la memoria de la pestaña.",
        },
        {
          tema: "Entrar a Administración sin ser administrador",
          texto: "Cada sección se niega con el rol que da el servidor, que es la autoridad.",
        },
      ],
    },
    {
      donde: "API",
      controles: [
        {
          tema: "Adivinar el código de verificación en dos pasos",
          texto: "Máximo 5 códigos por cuenta cada 15 minutos, aunque los intentos se repitan o lleguen al mismo tiempo.",
        },
        {
          tema: "Inyección SQL y parámetros alterados",
          texto: "Todas las consultas van con parámetros y las entradas se validan. Un dominio de otra empresa responde igual que uno que no existe.",
        },
      ],
    },
    {
      donde: "Sesiones",
      controles: [
        {
          tema: "Robo de sesiones guardadas",
          texto: "Se guarda una huella SHA-256 del token de sesión, nunca el token. El almacén pide contraseña y no queda expuesto a internet.",
        },
        {
          tema: "Alterar una sesión para cambiar de empresa o de rol",
          texto: "Hace falta la contraseña del almacén de sesiones, que solo vive en el servidor.",
        },
        {
          tema: "Datos de sesión en memoria",
          texto: "Las sesiones no se copian a disco y el almacén solo se alcanza desde la red interna.",
        },
      ],
    },
    {
      donde: "Base de datos",
      controles: [
        {
          tema: "Que una empresa lea los datos de otra",
          texto: "La base de datos aísla a cada empresa con seguridad por fila en las 20 tablas que tienen datos de clientes. La aplicación entra con un rol que no puede saltarse ese aislamiento, y sin empresa no se ve nada.",
        },
        {
          tema: "Robo de contraseñas y de secretos de verificación",
          texto: "Las contraseñas se guardan con argon2id. Los secretos de la verificación en dos pasos van cifrados con una llave que vive fuera de la base. De las brechas de datos nunca se guardan contraseñas.",
        },
        {
          tema: "Que la aplicación gane privilegios en la base",
          texto: "La única función con privilegios elevados, la del inicio de sesión, está limitada a 4 columnas y tiene pruebas automáticas.",
        },
        {
          tema: "Saber qué software usa otra empresa",
          texto: "Cada empresa solo ve las vulnerabilidades que aparecen en sus propios hallazgos.",
        },
      ],
    },
    {
      donde: "Escaneos",
      controles: [
        {
          tema: "Escanear un dominio que no es del cliente",
          texto: "Ningún escaneo corre sin carta de autorización vigente y sin un registro TXT de verificación en el DNS del dominio, consultado justo antes. Lo exigen el código y la base de datos.",
        },
        {
          tema: "No saber de dónde salió un dato",
          texto: "Cada escaneo registra qué fuente respondió y con qué resultado, y cada hallazgo guarda su fuente. Pedir, rechazar y terminar un escaneo queda en la bitácora.",
        },
        {
          tema: "Que las consultas revelen de más",
          texto: "Solo fuentes públicas pasivas y las peticiones que autoriza la carta, identificadas como LowTide. Cada fuente ve únicamente el dominio, la IP o la tecnología que se le consulta.",
        },
        {
          tema: "Una fuente lenta o caída",
          texto: "Cada fuente tiene límites de tiempo y reintentos a 1, 5 y 25 minutos. Si la fuente principal de certificados falla, otra la respalda y el escaneo se marca como parcial, nunca como completo.",
        },
        {
          tema: "Un escaneo que se queda colgado",
          texto: "Cada escaneo da señal de vida cada minuto. Sin señal en 30 minutos se da por caído, queda en la bitácora y el dominio se libera.",
        },
        {
          tema: "Que un sitio visitado desvíe a LowTide hacia su red interna (SSRF)",
          texto: "Las visitas solo van a direcciones públicas por el puerto 443, con máximo 3 redirecciones dentro del dominio, una petición por sitio y tope de tamaño y de tiempo.",
        },
        {
          tema: "Herramientas de terceros con acceso a llaves",
          texto: "La herramienta de subdominios se instala verificando su huella SHA-256, corre sin acceso a las llaves y solo con fuentes pasivas de una lista aprobada. Hoy está apagada.",
        },
      ],
    },
    {
      donde: "Fuentes públicas",
      controles: [
        {
          tema: "Una fuente suplantada",
          texto: "Todas las fuentes web se consultan por HTTPS con validación de certificado.",
        },
        {
          tema: "Respuestas incompletas de una fuente",
          texto: "Si la fuente de certificados no responde, el respaldo cubre los certificados vigentes y el escaneo se marca como parcial, con las reglas afectadas señaladas como sin cobertura.",
        },
      ],
    },
  ] satisfies GrupoDeControles[],
};
