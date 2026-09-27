export default function Toast({ toast }) {
  if (!toast) return null
  const estilos = toast.tipo === 'error' ? 'bg-debe' : 'bg-tinta'
  return (
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 ${estilos} text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg z-[70] animate-toast-in w-max max-w-[calc(100vw-2rem)] text-center`}
    >
      {toast.message}
    </div>
  )
}
