// Cuando no se pudieron traer los datos: qué pasó y cómo seguir.
export default function ErrorCarga({ mensaje, onReintentar }) {
  return (
    <div className="bg-hoja border border-renglon rounded-2xl px-5 py-6 text-center">
      <p className="text-[15px] text-tinta mb-4">{mensaje}</p>
      <button onClick={onReintentar} className="bg-tinta text-white rounded-2xl px-5 py-3 text-[15px] font-medium hover:brightness-125">
        Reintentar
      </button>
    </div>
  )
}
