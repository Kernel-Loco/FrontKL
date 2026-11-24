// Textos del aviso de privacidad y de los términos de uso del portal (RC-271). Se copian tal cual de las
// secciones 5.2, 5.7 y 11 de docs/politica_seguridad_privacidad.md de BackKL, sin editarlos a mano: si la
// política cambia, se copian de nuevo y se actualizan la versión, la fecha y la huella de legal.test.mjs.

export const POLITICA = {
  "nombre": "Política de seguridad y privacidad de LowTide",
  "version": "2.6",
  "fecha": "24 nov 2026"
} as const;

export const AVISO_INTEGRAL = {
  "seccion": "5.2",
  "titulo": "Aviso de privacidad integral de LowTide",
  "intro": "Es el aviso del responsable de la sección 5.1 para los usuarios del portal, para quien firma la carta y para quien escribe a seguridad@lowtidesec.com por el tráfico de LowTide. Sigue las fracciones del artículo 15.",
  "puntos": [
    {
      "texto": "Identidad y domicilio del responsable (fracción I): '[Titular por definir según el convenio Tec e IKUSI]', con domicilio en [domicilio del titular]. Mientras se define, todo lo de este aviso se atiende en arco@lowtidesec.com (sección 5.1)."
    },
    {
      "texto": "Datos que se tratan (fracción II):",
      "subpuntos": [
        "De los usuarios del portal: nombre, correo, empresa, rol, la huella argon2id de la contraseña, cifrada, la semilla TOTP cifrada, de cada passkey la llave pública, el nombre que le pone, el modelo del autenticador y cuándo se creó y se usó por última vez, la fecha del último acceso, la IP de cada evento de la bitácora y, al usar el chatbot de #38, la pregunta mientras se procesa para generar la respuesta. El sistema no conserva preguntas ni respuestas.",
        "De quien firma la carta: nombre, cargo, correo, la copia de su identificación y del poder que pide la sección 1 de la carta, y la huella sha256 de la carta.",
        "De quien escribe a seguridad@lowtidesec.com por el tráfico de LowTide: su correo, su nombre y lo que mande, como el dominio, la IP de origen, las fechas y los registros de su sitio.",
        "De quien ejerce sus derechos ARCO como usuario del portal o como quien firma, o lo representa: nombre, domicilio o medio para recibir respuesta, la copia de su identificación o la de su representante con su poder, y lo que pide (art. 28 y sección 5.7).",
        "Ningún dato sensible (art. 2, fracción VI) ni financiero."
      ]
    },
    {
      "texto": "Finalidades (fracción III): dar acceso al portal y a la API, proteger las cuentas (verificación en dos pasos, bloqueo por intentos y bitácora), probar quién autorizó cada análisis, responder dudas sobre los hallazgos, atender las solicitudes ARCO y la revocación del consentimiento, y revisar el tráfico de LowTide que alguien reporta a seguridad@lowtidesec.com y responderle. Todas son necesarias para el servicio que la empresa contrató o para atender a quien escribe. Basta el consentimiento tácito al poner este aviso a disposición de la persona (art. 7), porque no hay datos sensibles ni financieros. No hay finalidades secundarias: los datos no se usan para publicidad, perfiles ni para entrenar modelos."
    },
    {
      "texto": "Opciones para limitar el uso (fracción IV): no hay finalidades secundarias y, salvo lo que resuelva la revisión legal de la sección 9, tampoco transferencias que pidan consentimiento, así que no hace falta una lista de exclusión. Si la revisión califica alguna como transferencia, este aviso suma la cláusula para aceptarla o no (art. 35), salvo que quepa en un caso del artículo 36. Quien no quiera que su pregunta llegue al proveedor de IA puede no usar el chatbot, y cada hallazgo ya trae qué significa y qué hacer."
    },
    {
      "texto": "Derechos ARCO (fracción V): como dice la sección 5.7."
    },
    {
      "texto": "Cambios al aviso (fracción VI): se avisan en la página de inicio de sesión del portal y por correo, desde el buzón que atiende arco@lowtidesec.com (sección 5.7, punto 4) mientras no exista el correo de #28c, a los usuarios activos, a los que tienen la cuenta desactivada en espera de una carta nueva (sección 11, punto 7), a quien firmó cada carta sin revocar ni vencida (incluidas las que aún no empiezan) y al contacto de la sección 9 de su carta, y a quien tenga abierta una solicitud ARCO como usuario del portal o como quien firma, con 5 días hábiles de anticipación."
    },
    {
      "texto": "Revocación del consentimiento (art. 7): se pide a arco@lowtidesec.com, sin efectos retroactivos. Al revocar, la cuenta se desactiva y sus datos pasan al bloqueo de la sección 5.6. Si revoca quien firma, el equipo avisa a la empresa ese mismo día. Mientras la carta no venza, no termine porque la empresa vende o deja el dominio (sección 10 de la carta), que el equipo registra revocando todas las cartas sin revocar del dominio con la fecha de la venta o del abandono, o con la hora de su aviso si este no la trae (sección 9), y ni la empresa ni el equipo la revoquen, la carta sigue vigente y la base sigue aceptando análisis con ella, así que sus datos se siguen usando para autorizar cada análisis. Cuando la carta vence o se revoca, también cuando la empresa firma una carta nueva con otra persona y el equipo revoca la anterior, pasan al bloqueo de la sección 5.6. Hoy firmar una carta nueva no revoca sola la anterior (sección 9). Si eso basta ante la revocación es parte de la revisión legal de la sección 9."
    },
    {
      "texto": "Quién más recibe los datos: como personas encargadas que los tratan por cuenta del responsable, el equipo, que opera el portal, Cloudflare (Workers AI para el chatbot, DNS, túnel y Email Routing, que reenvía los correos de arco@lowtidesec.com y de seguridad@lowtidesec.com al buzón institucional @tec.mx de quien coordina el equipo, en Microsoft 365 del Tecnológico de Monterrey), Groq (respaldo del chatbot), Microsoft (Azure para el hospedaje, en la región westus2 de Estados Unidos, y Microsoft 365 del Tec para el buzón que guarda las solicitudes ARCO y los avisos de tráfico) y Resend, que manda desde acceso@lowtidesec.com el correo de inicio de sesión: recibe la dirección de correo de quien inicia sesión y su enlace, guarda los correos y sus registros 30 días y los trata en Estados Unidos (servicios_externos.md, RC-256, y el envío desde la API llega con RC-63). Las cuatro empresas son de Estados Unidos y pueden tratar los datos fuera de México. Al chatbot solo llega lo que dice la sección 5.8. No hay transferencias a terceros, salvo lo que resuelva la revisión legal de la sección 9."
    }
  ],
  "simplificadoTitulo": "Aviso simplificado para el inicio de sesión y para los formularios del portal (art. 16, fracción II):"
} as const;

export const AVISO_SIMPLIFICADO = {
  "antes": "[Titular por definir según el convenio Tec e IKUSI], con domicilio en [domicilio del titular], trata tu nombre, correo, empresa y rol, tu contraseña (solo su huella cifrada), tu verificación en dos pasos, tus passkeys, los registros de acceso con su IP y, cuando exista el chat, tus preguntas, para darte acceso a LowTide, proteger tu cuenta, dejar rastro de cada análisis, responder tus dudas sobre los hallazgos y atender tus derechos ARCO y la revocación de tu consentimiento. No los usamos para nada más. Si no quieres que tus preguntas lleguen al proveedor de IA, no uses el chat. El aviso de privacidad integral, con tus derechos ARCO y cómo revocar tu consentimiento, está en ",
  "url": "https://lowtidesec.com/privacidad",
  "despues": ". Para ejercerlos, escribe a arco@lowtidesec.com."
} as const;

export const ARCO = {
  "seccion": "5.7",
  "titulo": "Derechos ARCO y a quién se dirigen",
  "columnas": [
    "Quién los ejerce",
    "Ante quién",
    "Qué hace el equipo"
  ],
  "filas": [
    [
      "Empleado, exempleado o proveedor de una empresa cliente",
      "La empresa, que es la responsable",
      "Si la solicitud llega al equipo, la reenvía a la empresa en [5] días hábiles y sigue sus instrucciones, también sobre cuánto conservarla (sección 6 de la carta). Al reenviarla, borra del buzón, de Correo no deseado, de Enviados y de la papelera los correos con la copia de la identificación y los purga de Elementos recuperables (sección 5.6). Si la persona pide el acceso creyendo que el equipo es el responsable, basta con indicarle que no lo es (art. 32), y además se reenvía a la empresa"
    ],
    [
      "Usuario del portal o quien firma la carta",
      "El responsable de la sección 5.1, por arco@lowtidesec.com",
      "Responde como dicen los artículos 28 a 34"
    ]
  ],
  "tramite": "Cómo se tramita ante el equipo:",
  "pasos": [
    "La solicitud trae nombre y domicilio o medio para recibir respuesta, la identificación de la persona o de su representante, qué datos (salvo en el derecho de acceso), qué derecho y cualquier otro elemento que ayude a localizar los datos (art. 28).",
    "El equipo responde en un máximo de 20 días hábiles y, si procede, lo hace efectivo en los 15 siguientes. Cada plazo se puede ampliar una vez por un periodo igual (art. 31).",
    "Es gratis, salvo el costo de copias o envío (art. 34).",
    "Atiende las solicitudes quien coordine el equipo, como encargado, mientras el responsable no designe a otra persona (art. 29). Llegan a arco@lowtidesec.com, que no es un buzón propio: Email Routing de Cloudflare reenvía cada correo al buzón institucional @tec.mx de quien coordina el equipo, en Microsoft 365 del Tecnológico de Monterrey. Se probó con un correo real desde un buzón externo el 8 nov 2026. Los avisos de tráfico que llegan a seguridad@lowtidesec.com siguen el mismo camino al mismo buzón (sección 5.1), se conservan por el plazo de la sección 5.6 y se probaron igual el 24 nov 2026. Los adjuntos van hasta 15 MB en total, porque el correo los codifica y Email Routing no acepta mensajes de más de 25 MiB. Si pesan más, se mandan en varios correos. La respuesta sale de ese buzón al medio que indicó la persona. Como una solicitud trae la identificación de la persona, al cerrarla se borran del buzón, de Correo no deseado, de Enviados y de la papelera los correos con la copia de la identificación, incluidas las respuestas que la citen, se purgan de Elementos recuperables, y la solicitud y la respuesta se conservan por el plazo de la sección 5.6.",
    "Si la persona pide cancelar su cuenta, se desactiva, se borran la huella de su contraseña, su semilla TOTP y sus passkeys, y sus demás datos quedan en bloqueo, solo para las responsabilidades nacidas del tratamiento y por el plazo de prescripción. Al terminar el bloqueo se anonimizan su nombre y su correo y se le avisa (art. 24). La cadena de la bitácora no lo impide, porque solo usa el identificador del usuario. Hoy el equipo desactiva la cuenta en la base y le responde a la persona dentro de los plazos del punto 2. El bloqueo, la anonimización y el aviso al terminar se harán con la tarjeta de la sección 9.",
    "Si el equipo no responde, o si la persona no está conforme con la respuesta, puede acudir a la Secretaría Anticorrupción y Buen Gobierno. Si hubo respuesta, tiene 15 días desde que se le comunicó (arts. 2, fracción XV, y 40)."
  ]
} as const;

export const TERMINOS = {
  "seccion": "11",
  "titulo": "Términos de uso del portal",
  "intro": "Valen para el portal y la API, y quien inicia sesión los acepta.",
  "puntos": [
    "Qué es: un proyecto académico del equipo Kernel Loco (TC3008C, Tecnológico de Monterrey) para el reto de IKUSI VELATIA. LowTide es un nombre provisional, sin marca registrada. No garantiza disponibilidad y puede terminar al cerrar el curso.",
    "Quién puede usarlo: solo personas con cuenta propia, del equipo o de una empresa que firmó la carta de autorización, mientras tenga una vigente (punto 7). La llave de API, solo para los sistemas de la propia empresa. Un integrador, solo cuando la carta tenga dónde nombrarlo (sección 9). Hoy las cuentas las crea el equipo (control 5.18) y no se prestan ni comparten. Quien tiene una cuida su contraseña y verificación en dos pasos, y si cree que otro entró avisa al equipo (sección 9 de su carta).",
    "Qué dominios: solo los de la propia empresa, con carta firmada y vigente y TXT verificado (sección 1 de #6). La base lo exige al orquestador, pero frena una revocación solo desde que se registra (sección 5.6).",
    "Qué hace: solo observa fuentes públicas y hace las peticiones del Anexo A de la carta (sección 2 de #6). Nunca prueba contraseñas, explota fallas ni escanea puertos. Los resultados son una estimación con lo que las fuentes muestran ese día, no una auditoría, ni garantía de que no haya otros riesgos, ni opinión jurídica.",
    "Uso aceptable: el de la sección 7 de #6. Quien no lo cumpla pierde el acceso (sección 8 de #6).",
    "Datos personales: los de la cuenta los trata el responsable del aviso (sección 5.2). El responsable de los de empleados que salen en los hallazgos es la empresa (sección 5.1). En el chat no se escriben datos personales (sección 5.8).",
    "Al terminar: al vencer o revocarse la última carta de la empresa, la cuenta se desactiva, y si en [30] días el equipo carga una carta nueva, se reactiva cuando esta empiece, salvo que otra causa la mantenga desactivada. A los [30] días de ese fin sin carta nueva, al cerrar el curso o antes si la empresa pide por escrito borrar todos sus datos, la cuenta se desactiva, se borran la huella de su contraseña y su semilla TOTP, y su nombre y correo quedan en bloqueo y al final se anonimizan. Desde ese fin, o antes cuando el equipo revoca las cartas de la empresa al cerrar el curso o con ese escrito, las cartas, los datos de quien firma, las verificaciones del TXT, la bitácora hasta entonces y, desde que se cierran, las solicitudes ARCO de usuarios y de quien firma quedan en bloqueo por [plazo], solo como prueba, y al final se suprimen o se anonimizan (sección 5.6), y los hallazgos, activos y reportes de la empresa se borrarán en [30] días, con confirmación. Los de un dominio, igual al vencer o revocarse su última carta. Hoy la base no deja borrar ni anonimizar lo bloqueado ni los hallazgos que ya entraron en un score, y el fin de la carta no desactiva ni reactiva las cuentas (sección 9).",
    "Cambios y contacto: se avisan según la sección 5.2, punto 6. Privacidad y derechos ARCO, en arco@lowtidesec.com. Lo demás, con el equipo (sección 9 de la carta)."
  ]
} as const;
