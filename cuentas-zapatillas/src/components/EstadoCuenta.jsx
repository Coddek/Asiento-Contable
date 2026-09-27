import { formatFecha, formatPesos } from '../lib/fecha'

// Imagen del estado de cuenta para mandarle al cliente por WhatsApp. Se dibuja
// fuera de la pantalla y html-to-image le saca la foto; nunca se ve en la app.
export default function EstadoCuenta({ cliente, estado, fecha, ref }) {
  const { renglones, saldadoEl, saldo } = estado
  const debe = saldo > 0.005
  const aFavor = saldo < -0.005

  return (
    <div style={{ position: 'fixed', top: 0, left: -10000, pointerEvents: 'none' }} aria-hidden="true">
      <div ref={ref} className="w-[440px] bg-[#FAFAF9] p-6">
        <div className="bg-white border border-stone-200 rounded-3xl px-6 pt-6 pb-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wide mb-1">Estado de cuenta</p>
              <p className="text-xl font-semibold text-stone-900 tracking-tight leading-tight">{cliente.nombre}</p>
            </div>
            <p className="text-xs text-stone-400 mt-1">{formatFecha(fecha)}</p>
          </div>

          <div className="pb-5 mb-4 border-b border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
              {debe ? 'Saldo a pagar' : aFavor ? 'Saldo a favor' : 'Cuenta saldada'}
            </p>
            <p className={`text-[40px] font-semibold tracking-tight leading-none ${debe ? 'text-rose-600' : aFavor ? 'text-emerald-600' : 'text-stone-400'}`}>
              {formatPesos(Math.abs(saldo))}
            </p>
          </div>

          {saldadoEl && (
            <p className="text-xs text-stone-400 mb-2">Cuenta saldada al {formatFecha(saldadoEl)}. Movimientos desde entonces:</p>
          )}

          {renglones.length === 0 ? (
            <p className="text-sm text-stone-400 py-2">Sin movimientos.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] text-stone-400 uppercase tracking-wide">
                  <th className="text-left font-medium pb-2">Fecha</th>
                  <th className="text-left font-medium pb-2">Detalle</th>
                  <th className="text-right font-medium pb-2 pl-2">Debe</th>
                  <th className="text-right font-medium pb-2 pl-2">Haber</th>
                  <th className="text-right font-medium pb-2 pl-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {renglones.map((m, i) => (
                  <tr key={i} className="border-t border-stone-100 align-top">
                    <td className="py-2 pr-2 text-stone-400 whitespace-nowrap">{formatFecha(m.fecha).slice(0, 5)}</td>
                    <td className="py-2 text-stone-700">{m.referencia || '—'}</td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap text-rose-600">{Number(m.debe) > 0 ? formatPesos(m.debe) : ''}</td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap text-emerald-600">{Number(m.haber) > 0 ? formatPesos(m.haber) : ''}</td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap text-stone-900 font-semibold">{formatPesos(m.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
