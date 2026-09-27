// La marca de la app: una "cuenta T", el esquema contable de Debe a la
// izquierda y Haber a la derecha.
export default function MarcaT({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-tinta" />
      <path d="M7 11h18M16 11v14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
