// Único archivo con los textos de las páginas Aviso de privacidad y Términos de uso (HX27 de la auditoría del
// 15 nov, RC-323). Salen de las secciones 5.2, 5.7 y 11 de la política de seguridad y privacidad de BackKL
// (docs/politica_seguridad_privacidad.md, versión 2.0), sin las referencias internas a otras secciones, tarjetas o
// documentos del equipo. Lo que la política deja entre corchetes, como el titular o un plazo, aquí se dice como
// 'por definir' o 'propuesta'. Si la política cambia, se copian de nuevo estos textos.

export interface Apartado {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  titulo: string;
  intro: string;
  /** Fecha de la versión de la política de la que salen los textos. */
  fecha: string;
  apartados: Apartado[];
}

export const PRIVACIDAD: DocumentoLegal & { simplificado: string } = {
  titulo: "Aviso de privacidad",
  intro:
    "Qué datos personales trata LowTide de quienes usan el portal y de quien firma la carta de autorización, para qué y cómo ejercer tus derechos.",
  fecha: "8 de noviembre de 2026",
  simplificado:
    "El responsable de tus datos, que se definirá en el convenio entre el Tecnológico de Monterrey e IKUSI, trata tu nombre, correo, empresa y rol, los registros de acceso y, cuando exista el chat, tus preguntas, para darte acceso a LowTide, proteger tu cuenta, dejar rastro de cada análisis y responder tus dudas sobre los hallazgos. No los usamos para nada más. Cuando exista el chat, si no quieres que tus preguntas lleguen al proveedor de IA, no lo uses. El aviso integral, con tus derechos ARCO y cómo revocar tu consentimiento, es el de esta página. Para ejercerlos, escribe a arco@lowtidesec.com.",
  apartados: [
    {
      titulo: "Quién es el responsable",
      parrafos: [
        "El titular de los datos de los usuarios del portal y de quien firma la carta, con su domicilio, está por definir en el convenio entre el Tecnológico de Monterrey e IKUSI. Mientras se define, todo lo de este aviso se atiende en arco@lowtidesec.com.",
        "Los datos de los empleados de una empresa que aparecen en sus hallazgos son responsabilidad de esa empresa, que informa a sus empleados en su propio aviso de privacidad.",
      ],
    },
    {
      titulo: "Qué datos se tratan",
      parrafos: [
        "De los usuarios del portal: nombre, correo, empresa, rol, la huella argon2id de la contraseña, la semilla de la verificación en dos pasos cifrada, la fecha del último acceso, la IP de cada evento de la bitácora y, cuando exista el chat, las preguntas que le escriban.",
        "De quien firma la carta: nombre, cargo, correo, la copia de su identificación y del poder que pide la carta, y la huella SHA-256 de la carta.",
        "De quien ejerce sus derechos ARCO: nombre, domicilio o medio para recibir respuesta, la copia de su identificación o la de su representante con su poder, y lo que pide.",
        "Ningún dato sensible ni financiero.",
      ],
    },
    {
      titulo: "Para qué se usan",
      parrafos: [
        "Para dar acceso al portal y a la API, proteger las cuentas con la verificación en dos pasos, el bloqueo por intentos y la bitácora, probar quién autorizó cada análisis, responder dudas sobre los hallazgos y atender las solicitudes ARCO y la revocación del consentimiento.",
        "Todas son necesarias para el servicio que contrató tu empresa y basta el consentimiento tácito, porque no hay datos sensibles ni financieros. No hay finalidades secundarias: los datos no se usan para publicidad, perfiles ni para entrenar modelos.",
      ],
    },
    {
      titulo: "Quién más recibe los datos",
      parrafos: [
        "Los tratan por cuenta del responsable el equipo Kernel Loco, que opera el portal, Cloudflare (DNS, túnel, el reenvío de los correos de arco@lowtidesec.com y, cuando exista el chat, su modelo de IA), Groq (respaldo del chat, cuando exista) y Microsoft (Azure para el hospedaje y Microsoft 365 del Tecnológico de Monterrey para el buzón que guarda las solicitudes ARCO). Son empresas de Estados Unidos y pueden tratar los datos fuera de México.",
        "El chat todavía no existe. Cuando exista, solo le llegarán el título, la categoría y la severidad de los hallazgos, sin correos, y la pregunta que escribas, y ninguno de sus proveedores entrenará con las preguntas ni las guardará después de responder. No escribas datos personales en el chat.",
        "No hay transferencias a terceros, salvo lo que resuelva la revisión legal pendiente.",
      ],
    },
    {
      titulo: "Tus derechos ARCO",
      parrafos: [
        "Puedes pedir el acceso, la rectificación, la cancelación o la oposición al tratamiento de tus datos escribiendo a arco@lowtidesec.com. La solicitud trae tu nombre y un medio para responderte, tu identificación o la de tu representante con su poder, qué datos (salvo para el acceso), qué derecho y lo que ayude a localizarlos.",
        "La respuesta llega en un máximo de 20 días hábiles y, si procede, se hace efectiva en los 15 siguientes. Cada plazo se puede ampliar una vez por un periodo igual. Es gratis, salvo el costo de copias o envío.",
        "Si pides la cancelación, tu cuenta se desactiva y se borran la huella de tu contraseña y tu semilla de verificación. Tus demás datos quedan en bloqueo y al terminar el bloqueo se anonimizan tu nombre y tu correo. Hoy el sistema todavía no deja anonimizarlos, así que se conservan.",
        "Si eres empleado de una empresa cliente, la responsable de tus datos es tu empresa. Si tu solicitud llega al equipo, se le reenvía a ella.",
        "Si no recibes respuesta o no estás conforme con ella, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno. Si hubo respuesta, tienes 15 días desde que se te comunicó.",
      ],
    },
    {
      titulo: "Cómo revocar tu consentimiento",
      parrafos: [
        "Se pide a arco@lowtidesec.com, sin efectos retroactivos. Al revocar, la cuenta se desactiva y sus datos pasan a bloqueo, solo como prueba de lo que hizo cada persona, y al final se suprimen o se anonimizan. Hoy el sistema todavía no deja suprimir ni anonimizar lo que está en bloqueo, así que esos datos se conservan.",
        "Si revoca quien firmó la carta, el equipo avisa a la empresa ese mismo día. La carta sigue vigente mientras la empresa o el equipo no la revoquen y no venza.",
      ],
    },
    {
      titulo: "Cambios a este aviso",
      parrafos: [
        "Se avisan en el portal al iniciar sesión y por correo a los usuarios, a quien firmó cada carta vigente y a quien tenga abierta una solicitud ARCO, con 5 días hábiles de anticipación (propuesta).",
      ],
    },
  ],
};

export const TERMINOS: DocumentoLegal = {
  titulo: "Términos de uso",
  intro: "Valen para el portal y la API de LowTide. Quien inicia sesión los acepta.",
  fecha: "8 de noviembre de 2026",
  apartados: [
    {
      titulo: "Qué es LowTide",
      parrafos: [
        "Un proyecto académico del equipo Kernel Loco (TC3008C, Tecnológico de Monterrey) para el reto de IKUSI VELATIA. LowTide es un nombre provisional, sin marca registrada. No garantiza disponibilidad y puede terminar al cerrar el curso.",
      ],
    },
    {
      titulo: "Quién puede usarlo",
      parrafos: [
        "Solo personas con cuenta propia, del equipo o de una empresa que firmó la carta de autorización, mientras tenga una vigente. La llave de API, solo para los sistemas de la propia empresa.",
        "Las cuentas las crea el equipo y no se prestan ni se comparten. Quien tiene una cuida su contraseña y su verificación en dos pasos, y si cree que otra persona entró, avisa al equipo.",
      ],
    },
    {
      titulo: "Qué dominios se analizan",
      parrafos: [
        "Solo los de la propia empresa, con carta firmada y vigente y el registro TXT de verificación en su DNS. La base de datos lo exige antes de cada análisis y frena una revocación desde que el equipo la registra.",
      ],
    },
    {
      titulo: "Qué hace y qué no",
      parrafos: [
        "Solo observa fuentes públicas y hace las peticiones que lista el anexo de la carta. Nunca prueba contraseñas, explota fallas ni escanea puertos.",
        "Los resultados son una estimación con lo que las fuentes muestran ese día. No son una auditoría, ni garantía de que no haya otros riesgos, ni opinión jurídica.",
      ],
    },
    {
      titulo: "Uso aceptable",
      parrafos: [
        "El que fija la política de uso ético del equipo. Quien no la cumpla pierde el acceso.",
      ],
    },
    {
      titulo: "Datos personales",
      parrafos: [
        "Los de tu cuenta los trata el responsable del aviso de privacidad. El responsable de los datos de empleados que aparecen en los hallazgos es su empresa. En el chat no se escriben datos personales.",
      ],
    },
    {
      titulo: "Al terminar",
      parrafos: [
        "Al vencer o revocarse la última carta de la empresa, la cuenta se desactiva. Si en 30 días (propuesta) se carga una carta nueva, se reactiva cuando esta empiece.",
        "Si en esos 30 días (propuesta) no llega una carta nueva, al cerrar el curso o antes si la empresa pide por escrito borrar todos sus datos, lo que pase primero, la cuenta se desactiva, se borran la huella de su contraseña y su semilla de verificación, y su nombre y correo quedan en bloqueo y al final se anonimizan. Los hallazgos, activos y reportes de la empresa se borrarán en 30 días (propuesta), con confirmación.",
        "Hoy el sistema todavía no desactiva ni reactiva las cuentas solo al terminar la carta, y no deja borrar ni anonimizar lo que está en bloqueo ni los hallazgos que ya entraron en un score.",
      ],
    },
    {
      titulo: "Cambios y contacto",
      parrafos: [
        "Los cambios se avisan como dice el aviso de privacidad. Privacidad y derechos ARCO, en arco@lowtidesec.com. Lo demás, con el equipo.",
      ],
    },
  ],
};
