import { formatFecha, formatPesos } from '../lib/fecha'

// Imagen del estado de cuenta para mandarle al cliente por WhatsApp. Se dibuja
// fuera de la pantalla y html-to-image le saca la foto; nunca se ve en la app.
// Mismo lenguaje que la app: papel de libro, Debe y Haber separados por la línea.
export default function EstadoCuenta({ cliente, estado, fecha, ref }) {
  const { renglones, saldadoEl, saldo } = estado
  const debe = saldo > 0.005
  const aFavor = saldo < -0.005

  return (
    <div style={{ position: 'fixed', top: 0, left: -10000, pointerEvents: 'none' }} aria-hidden="true">
      <div ref={ref} className="w-[440px] bg-papel p-6 font-texto text-tinta">
        <div className="bg-hoja border border-renglon rounded-3xl px-6 pt-6 pb-5">
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <p className="text-[14px] text-tinta-suave">Estado de cuenta</p>
            <p className="text-[13px] text-tinta-tenue">{formatFecha(fecha)}</p>
          </div>
          <p className="font-titulo text-[26px] font-semibold leading-tight tracking-tight mb-5">{cliente.nombre}</p>

          <p className="text-[14px] text-tinta-suave">{debe ? 'Saldo a pagar' : aFavor ? 'Saldo a favor' : 'Cuenta al día'}</p>
          <p className={`font-titulo cifras text-[44px] font-semibold tracking-tight leading-[1.05] mb-5 ${debe ? 'text-debe' : aFavor ? 'text-haber' : 'text-tinta-tenue'}`}>
            {formatPesos(Math.abs(saldo))}
          </p>

          {saldadoEl && (
            <p className="text-[13px] text-tinta-tenue mb-2">Cuenta saldada al {formatFecha(saldadoEl)}. Movimientos desde entonces:</p>
          )}

          {renglones.length === 0 ? (
            <p className="text-[14px] text-tinta-tenue py-2">Sin movimientos.</p>
          ) : (
            <table className="w-full text-[13px] cifras">
              <thead>
                <tr className="border-b-2 border-tinta">
                  <th className="text-left font-medium pb-2 pr-2">Fecha</th>
                  <th className="text-left font-medium pb-2">Detalle</th>
                  <th className="text-right font-medium pb-2 px-2">Debe</th>
                  <th className="text-right font-medium pb-2 px-2 border-l-2 border-tinta">Haber</th>
                  <th className="text-right font-medium pb-2 pl-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {renglones.map((m, i) => (
                  <tr key={i} className="border-b border-renglon-suave align-top">
                    <td className="py-2 pr-2 text-tinta-tenue whitespace-nowrap">{formatFecha(m.fecha).slice(0, 5)}</td>
                    <td className="py-2 text-tinta-suave">{m.referencia || '—'}</td>
                    <td className="py-2 px-2 text-right whitespace-nowrap text-debe">{Number(m.debe) > 0 ? formatPesos(m.debe) : ''}</td>
                    <td className="py-2 px-2 text-right whitespace-nowrap text-haber border-l-2 border-tinta">{Number(m.haber) > 0 ? formatPesos(m.haber) : ''}</td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap font-semibold">{formatPesos(m.saldo)}</td>
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
