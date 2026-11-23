// Único archivo con los textos de la página Revisión OWASP ASVS (#75, RC-136). Son los de la revisión de LowTide con
// ASVS 5.0 nivel 1 del 23 de noviembre de 2026: el requisito, el estado y el texto público de cada fila. No se editan
// aquí a mano: si la revisión cambia, se copian de nuevo y se actualiza la huella de asvs.test.mjs, que es la misma
// que revisa la prueba de la revisión en el backend.

/** Estado de la revisión. «No cumple» se muestra como «En corrección», con el plan en su texto. */
export type EstadoAsvs = "Cumple" | "No cumple" | "No aplica";

export interface RequisitoAsvs {
  /** Identificador de ASVS 5.0, como V6.2.1. */
  id: string;
  /** El requisito resumido en español. */
  titulo: string;
  estado: EstadoAsvs;
  /** Una línea en lenguaje llano: qué hace LowTide, o el plan si está en corrección. */
  texto: string;
}

export interface CapituloAsvs {
  id: string;
  nombre: string;
}

export const ASVS = {
  titulo: "LowTide revisado con OWASP ASVS 5.0, nivel 1",
  fecha: "23 de noviembre de 2026",
  intro:
    "OWASP ASVS es el estándar abierto con el que se verifica la seguridad de una aplicación web. Revisamos LowTide contra los 70 requisitos de su nivel 1, uno por uno, con pruebas automáticas, un escaneo activo con ZAP y la revisión del código y de la configuración. Un requisito en corrección ya tiene su plan; aquí se cuenta qué se hará, sin detalles que sirvan para atacarlo.",
  atribucion:
    "OWASP Application Security Verification Standard 5.0.0, de la OWASP Foundation, bajo la licencia CC BY-SA 4.0. Los resúmenes en español son nuestros.",
  capitulos: [
    { id: "V1", nombre: "Codificación y saneamiento" },
    { id: "V2", nombre: "Validación y lógica de negocio" },
    { id: "V3", nombre: "Seguridad del frontend web" },
    { id: "V4", nombre: "API y servicios web" },
    { id: "V5", nombre: "Manejo de archivos" },
    { id: "V6", nombre: "Autenticación" },
    { id: "V7", nombre: "Manejo de sesiones" },
    { id: "V8", nombre: "Autorización" },
    { id: "V9", nombre: "Tokens autocontenidos" },
    { id: "V10", nombre: "OAuth y OIDC" },
    { id: "V11", nombre: "Criptografía" },
    { id: "V12", nombre: "Comunicación segura" },
    { id: "V13", nombre: "Configuración" },
    { id: "V14", nombre: "Protección de datos" },
    { id: "V15", nombre: "Código y arquitectura seguros" },
    { id: "V16", nombre: "Bitácora y errores" },
    { id: "V17", nombre: "WebRTC" },
  ] satisfies CapituloAsvs[],
  requisitos: [
    { id: "V1.2.1", titulo: "Codificar la salida según su contexto (HTML, atributos, cabeceras)", estado: "Cumple", texto: "El portal y los reportes escapan todo lo que muestran." },
    { id: "V1.2.2", titulo: "Codificar los datos en URLs dinámicas y permitir solo protocolos seguros", estado: "Cumple", texto: "Los enlaces se arman codificando cada dato y nunca con protocolos peligrosos." },
    { id: "V1.2.3", titulo: "Escapar al construir JavaScript o JSON dinámico", estado: "Cumple", texto: "El JSON siempre lo arma una librería, nunca concatenando texto." },
    { id: "V1.2.4", titulo: "Consultas parametrizadas contra inyección en la base", estado: "Cumple", texto: "Todas las consultas a la base van parametrizadas." },
    { id: "V1.2.5", titulo: "Proteger contra inyección de comandos del sistema", estado: "Cumple", texto: "Los programas externos se llaman sin pasar por una consola." },
    { id: "V1.3.1", titulo: "Sanear el HTML de editores WYSIWYG", estado: "No aplica", texto: "No aplica: LowTide no acepta HTML de los usuarios." },
    { id: "V1.3.2", titulo: "No usar eval() ni ejecución dinámica de código", estado: "Cumple", texto: "No se ejecuta código armado con datos de los usuarios." },
    { id: "V1.5.1", titulo: "Parsers XML sin entidades externas (XXE)", estado: "Cumple", texto: "El único XML que se lee rechaza DTD y entidades externas." },
    { id: "V2.1.1", titulo: "Documentar las reglas de validación de la entrada", estado: "Cumple", texto: "Las reglas de cada dato de entrada están documentadas." },
    { id: "V2.2.1", titulo: "Validar la entrada contra lo esperado (listas permitidas, rangos)", estado: "Cumple", texto: "La API valida cada dato que recibe con reglas de lo permitido." },
    { id: "V2.2.2", titulo: "Validar en el servidor, no solo en el cliente", estado: "Cumple", texto: "Cada validación se repite en el servidor." },
    { id: "V2.3.1", titulo: "Flujos de varios pasos en orden y sin saltarse pasos", estado: "Cumple", texto: "Los pasos del inicio de sesión y del alta de dominios no se pueden saltar." },
    { id: "V3.2.1", titulo: "Evitar que el navegador interprete una respuesta fuera de contexto", estado: "Cumple", texto: "Las respuestas de la API y las descargas no se pueden abrir como página." },
    { id: "V3.2.2", titulo: "Mostrar texto como texto, no como HTML", estado: "Cumple", texto: "Lo que escribe un usuario siempre se muestra como texto." },
    { id: "V3.3.1", titulo: "Cookies con Secure y prefijo __Host- o __Secure-", estado: "No cumple", texto: "En corrección: la cookie de sesión ya es segura y solo para el sitio; falta darle el prefijo que lo garantiza en el navegador." },
    { id: "V3.4.1", titulo: "HSTS de al menos un año en todas las respuestas", estado: "Cumple", texto: "Todo el sitio obliga al navegador a usar HTTPS durante un año." },
    { id: "V3.4.2", titulo: "CORS con un origen fijo o validado", estado: "Cumple", texto: "Ningún otro sitio puede leer las respuestas de la API." },
    { id: "V3.5.1", titulo: "Proteger contra CSRF las peticiones que no pasan por preflight", estado: "Cumple", texto: "Las acciones solo se aceptan desde el propio portal." },
    { id: "V3.5.2", titulo: "Que no se pueda llamar sin preflight a lo que depende de él", estado: "Cumple", texto: "No hace falta el preflight de CORS: el origen se revisa siempre." },
    { id: "V3.5.3", titulo: "Las acciones sensibles no usan métodos seguros como GET", estado: "Cumple", texto: "Ninguna acción que cambia datos se hace con un simple enlace." },
    { id: "V4.1.1", titulo: "Content-Type correcto, con charset en los tipos de texto", estado: "Cumple", texto: "Cada respuesta declara su tipo y su codificación." },
    { id: "V4.4.1", titulo: "WebSocket solo sobre TLS", estado: "No aplica", texto: "No aplica: LowTide no usa WebSocket." },
    { id: "V5.2.1", titulo: "Aceptar solo archivos de un tamaño que se pueda procesar", estado: "Cumple", texto: "Los archivos que se suben tienen un tamaño máximo." },
    { id: "V5.2.2", titulo: "Revisar que la extensión y el contenido correspondan", estado: "Cumple", texto: "Se revisa que cada archivo sea de verdad del tipo que dice." },
    { id: "V5.3.1", titulo: "Archivos subidos nunca se ejecutan en el servidor", estado: "Cumple", texto: "Los archivos subidos se guardan cifrados y nunca se ejecutan." },
    { id: "V5.3.2", titulo: "Rutas de archivos con nombres internos, no del usuario", estado: "Cumple", texto: "Los archivos se guardan con nombres que genera LowTide." },
    { id: "V6.1.1", titulo: "Documentar los controles contra fuerza bruta y relleno de credenciales", estado: "Cumple", texto: "Los límites contra ataques de contraseñas están documentados." },
    { id: "V6.2.1", titulo: "Contraseñas de al menos 8 caracteres (se recomiendan 15)", estado: "Cumple", texto: "Las contraseñas tienen al menos 12 caracteres." },
    { id: "V6.2.2", titulo: "Se puede cambiar la contraseña", estado: "Cumple", texto: "Cada persona puede cambiar su contraseña desde su perfil." },
    { id: "V6.2.3", titulo: "El cambio pide la contraseña actual y la nueva", estado: "Cumple", texto: "Para cambiarla se pide la contraseña actual." },
    { id: "V6.2.4", titulo: "Revisar las nuevas contra las 3000 más comunes", estado: "Cumple", texto: "Se rechazan las contraseñas comunes." },
    { id: "V6.2.5", titulo: "Sin reglas de composición (mayúsculas, números, símbolos)", estado: "Cumple", texto: "Cualquier combinación de caracteres es válida." },
    { id: "V6.2.6", titulo: "Campos de contraseña con type=password", estado: "Cumple", texto: "Las contraseñas se escriben ocultas." },
    { id: "V6.2.7", titulo: "Permitir pegar y los gestores de contraseñas", estado: "Cumple", texto: "Funcionan el pegado y los gestores de contraseñas." },
    { id: "V6.2.8", titulo: "Verificar la contraseña tal cual, sin recortar ni cambiar mayúsculas", estado: "Cumple", texto: "La contraseña se revisa exactamente como se escribió." },
    { id: "V6.3.1", titulo: "Controles contra fuerza bruta según la documentación", estado: "Cumple", texto: "Hay captcha y bloqueo por intentos fallidos." },
    { id: "V6.3.2", titulo: "Sin cuentas por omisión como admin o root", estado: "Cumple", texto: "No existen cuentas con nombres o contraseñas por omisión." },
    { id: "V6.4.1", titulo: "Contraseñas iniciales o códigos de activación al azar, de un uso y que vencen", estado: "Cumple", texto: "No hay contraseñas iniciales: cada persona pone la suya con un enlace de un solo uso." },
    { id: "V6.4.2", titulo: "Sin pistas ni preguntas secretas", estado: "Cumple", texto: "No hay pistas ni preguntas secretas." },
    { id: "V7.2.1", titulo: "La sesión se verifica en un servicio confiable del servidor", estado: "Cumple", texto: "Cada sesión se revisa en el servidor en cada petición." },
    { id: "V7.2.2", titulo: "Tokens de sesión dinámicos, no secretos fijos", estado: "Cumple", texto: "Cada inicio de sesión crea un token nuevo." },
    { id: "V7.2.3", titulo: "Tokens de referencia únicos, de un CSPRNG y con 128 bits o más", estado: "Cumple", texto: "El token de sesión tiene 256 bits al azar y no se guarda en claro." },
    { id: "V7.2.4", titulo: "Token nuevo al autenticarse, y se termina el anterior", estado: "No cumple", texto: "En corrección: cada inicio de sesión ya crea un token nuevo; falta cerrar del todo la sesión anterior del mismo navegador." },
    { id: "V7.4.1", titulo: "Al cerrar sesión o vencer, la sesión ya no sirve", estado: "Cumple", texto: "Al cerrar sesión, o a los 15 minutos sin uso, la sesión deja de servir en el servidor." },
    { id: "V7.4.2", titulo: "Al desactivar o borrar una cuenta, se cierran todas sus sesiones", estado: "No cumple", texto: "En corrección: al dar de baja una cuenta, el portal la saca de inmediato; falta que la API también la corte en todas sus sesiones abiertas." },
    { id: "V8.1.1", titulo: "Documentar las reglas de acceso por función y por dato", estado: "Cumple", texto: "Está documentado qué puede hacer cada rol y qué datos ve cada empresa." },
    { id: "V8.2.1", titulo: "Acceso a funciones solo con permiso explícito", estado: "Cumple", texto: "Cada función revisa el rol antes de responder." },
    { id: "V8.2.2", titulo: "Acceso a datos solo con permiso sobre cada dato (IDOR, BOLA)", estado: "Cumple", texto: "La base de datos aísla a cada empresa: nadie ve datos de otra." },
    { id: "V8.3.1", titulo: "Autorizar en el servidor, no en el cliente", estado: "Cumple", texto: "Los permisos se revisan en el servidor, no solo en la pantalla." },
    { id: "V9.1.1", titulo: "Validar la firma o el MAC de los tokens autocontenidos", estado: "No aplica", texto: "No aplica: LowTide no usa tokens tipo JWT." },
    { id: "V9.1.2", titulo: "Solo algoritmos de una lista permitida para esos tokens", estado: "No aplica", texto: "No aplica: LowTide no usa tokens tipo JWT." },
    { id: "V9.1.3", titulo: "Llaves de esos tokens solo de fuentes confiables", estado: "No aplica", texto: "No aplica: LowTide no usa tokens tipo JWT." },
    { id: "V9.2.1", titulo: "Respetar la vigencia (nbf, exp) de esos tokens", estado: "No aplica", texto: "No aplica: LowTide no usa tokens tipo JWT." },
    { id: "V10.4.1", titulo: "El servidor OAuth valida las redirect URI exactas", estado: "No aplica", texto: "No aplica: LowTide no usa OAuth." },
    { id: "V10.4.2", titulo: "Código de autorización de un solo uso", estado: "No aplica", texto: "No aplica: LowTide no usa OAuth." },
    { id: "V10.4.3", titulo: "Código de autorización de vida corta", estado: "No aplica", texto: "No aplica: LowTide no usa OAuth." },
    { id: "V10.4.4", titulo: "Solo los grants que cada cliente necesita", estado: "No aplica", texto: "No aplica: LowTide no usa OAuth." },
    { id: "V10.4.5", titulo: "Contra la repetición de refresh tokens", estado: "No aplica", texto: "No aplica: LowTide no usa OAuth." },
    { id: "V11.3.1", titulo: "Sin modos de bloque inseguros (ECB) ni rellenos débiles", estado: "Cumple", texto: "Los datos se cifran con AES-256-GCM." },
    { id: "V11.3.2", titulo: "Solo cifrados aprobados, como AES-GCM", estado: "Cumple", texto: "Solo se usan cifrados aprobados." },
    { id: "V11.4.1", titulo: "Solo funciones hash aprobadas; nunca MD5 con fines criptográficos", estado: "Cumple", texto: "Contraseñas con argon2id y tokens con SHA-256; ningún hash débil protege datos." },
    { id: "V12.1.1", titulo: "Solo TLS 1.2 y 1.3, con 1.3 de preferencia", estado: "No cumple", texto: "En corrección: el sitio prefiere TLS 1.3; falta apagar en el borde las versiones viejas 1.0 y 1.1." },
    { id: "V12.2.1", titulo: "TLS en toda conexión con servicios externos, sin bajar a HTTP", estado: "Cumple", texto: "Todo el tráfico va por HTTPS." },
    { id: "V12.2.2", titulo: "Certificados de confianza pública", estado: "Cumple", texto: "El sitio usa un certificado de una autoridad pública." },
    { id: "V13.4.1", titulo: "Desplegar sin metadatos de control de versiones (.git)", estado: "Cumple", texto: "El despliegue no lleva archivos del repositorio." },
    { id: "V14.2.1", titulo: "Datos sensibles solo en el cuerpo o en cabeceras, nunca en la URL", estado: "Cumple", texto: "Ningún token ni llave viaja en la URL." },
    { id: "V14.3.1", titulo: "Borrar del cliente los datos de la sesión al terminarla", estado: "Cumple", texto: "Al cerrar sesión, el navegador no conserva datos de la cuenta." },
    { id: "V15.1.1", titulo: "Documentar plazos, según el riesgo, para corregir componentes vulnerables", estado: "Cumple", texto: "Hay plazos escritos para corregir librerías con vulnerabilidades, según su gravedad." },
    { id: "V15.2.1", titulo: "Ningún componente fuera de esos plazos", estado: "Cumple", texto: "Las librerías se revisan cada semana y no hay vulnerabilidades abiertas fuera de plazo." },
    { id: "V15.3.1", titulo: "Devolver solo los campos necesarios", estado: "Cumple", texto: "La API solo devuelve los campos que cada pantalla necesita." },
  ] satisfies RequisitoAsvs[],
};
