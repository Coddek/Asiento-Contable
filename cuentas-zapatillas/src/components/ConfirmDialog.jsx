import Hoja from './Hoja'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <Hoja titulo={title} onCerrar={onCancel}>
      <p className="text-[15px] text-tinta-suave mb-6 -mt-2">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 border border-renglon rounded-2xl py-3.5 text-[15px] font-medium hover:bg-papel">
          Cancelar
        </button>
        <button onClick={onConfirm} className="flex-1 bg-debe text-white rounded-2xl py-3.5 text-[15px] font-medium hover:brightness-110">
          {confirmLabel}
        </button>
      </div>
    </Hoja>
  )
}
