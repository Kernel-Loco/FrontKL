/** Formas decorativas del fondo de autenticación (mancha arriba a la derecha y anillos abajo a la izquierda). */
export function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 740 650"
        className="absolute right-0 top-0 w-[90vw] max-w-[1100px] sm:w-[70vw] md:w-[59vw]"
      >
        <path
          className="fill-cirdan-700"
          d="M0 0C40 75 110 128 225 125c105-3 245-15 320 15 75 30 65 120 15 210-40 70-90 120-80 190 15 80 120 105 260 108V0Z"
        />
      </svg>
      <svg
        viewBox="0 0 445 455"
        className="absolute bottom-0 left-0 w-[75vw] max-w-[680px] sm:w-[45vw] md:w-[35.5vw]"
      >
        <circle cx="155" cy="290" r="290" className="fill-cirdan-700" />
        <circle cx="155" cy="290" r="222" className="fill-cirdan-800" />
        <circle cx="155" cy="290" r="162" className="fill-cirdan-950" />
      </svg>
    </div>
  );
}
