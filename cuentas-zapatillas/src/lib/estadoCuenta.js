// Arma el desglose del estado de cuenta: movimientos en orden cronológico con
// el saldo acumulado renglón por renglón. Si la cuenta quedó en cero en algún
// momento, arranca después de la última vez que quedó saldada: al cliente le
// importa lo que está pendiente, no lo que ya pagó hace meses.
export function armarEstado(movimientos) {
  const ordenados = [...movimientos].sort((a, b) =>
    a.fecha === b.fecha ? a.created_at.localeCompare(b.created_at) : a.fecha.localeCompare(b.fecha)
  )
  let saldo = 0
  let desde = 0
  let saldadoEl = null
  const renglones = ordenados.map((m, i) => {
    saldo += Number(m.debe) - Number(m.haber)
    if (Math.abs(saldo) < 0.005 && i < ordenados.length - 1) {
      desde = i + 1
      saldadoEl = m.fecha
    }
    return { ...m, saldo }
  })
  return { renglones: renglones.slice(desde), saldadoEl, saldo }
}
