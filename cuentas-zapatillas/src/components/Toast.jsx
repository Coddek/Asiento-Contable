export default function Toast({ toast }) {
  if (!toast) return null
  const estilos = toast.tipo === 'error' ? 'bg-rose-600' : 'bg-stone-900'
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 ${estilos} text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-[70] animate-toast-in`}
    >
      {toast.message}
    </div>
  )
}
