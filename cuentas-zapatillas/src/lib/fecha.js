// Todas las fechas de la app van en horario de Argentina, esté donde esté el
// dispositivo. Antes se usaba toISOString(), que da la fecha en UTC: después
// de las 21 h, un movimiento de hoy quedaba con la fecha de mañana.
const ZONA = 'America/Argentina/Buenos_Aires'

// Fecha de hoy en Argentina, como 'YYYY-MM-DD' (el formato de los <input type="date">).
export function hoyArgentina() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

// Días entre una fecha 'YYYY-MM-DD' y hoy (en Argentina).
export function diasHasta(fechaStr) {
  const aUTC = (s) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.floor((aUTC(hoyArgentina()) - aUTC(fechaStr)) / 86400000)
}

// 'YYYY-MM-DD' → '22/09/2026'
export function formatFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-')
  return `${d}/${m}/${y}`
}

// Monto en pesos, sin centavos si no los tiene: $ 45.000 · $ 1.250,50
export function formatPesos(n) {
  const v = Number(n)
  return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}
