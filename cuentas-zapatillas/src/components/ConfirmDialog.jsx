export default function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center px-4 z-[70]">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-stone-900 mb-1.5">{title}</h3>
        <p className="text-sm text-stone-500 mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 border border-stone-200 text-stone-600 rounded-full py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
