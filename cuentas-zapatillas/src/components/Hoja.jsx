import { useEffect } from 'react'

// Formulario que sube desde abajo en el celu y aparece centrado en pantallas
// grandes. Se cierra tocando afuera o con Escape.
export default function Hoja({ titulo, onCerrar, children }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-tinta/40"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="animate-hoja w-full sm:max-w-md bg-hoja rounded-t-3xl sm:rounded-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 max-h-[92dvh] overflow-y-auto"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-renglon sm:hidden" />
        <h2 className="font-titulo text-xl font-semibold mb-4">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
