import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClienteDetalle from './ClienteDetalle'
import Toast from './Toast'
import Spinner from './Spinner'
import Hoja from './Hoja'
import MarcaT from './MarcaT'
import ErrorCarga from './ErrorCarga'
import { useToast } from '../hooks/useToast'
import { diasHasta, hoyArgentina, formatPesos } from '../lib/fecha'
import { mensajeError } from '../lib/errores'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const campo =
  'w-full bg-hoja border border-renglon rounded-2xl px-4 py-3.5 text-[16px] outline-none placeholder:text-tinta-tenue focus:border-tinta focus-visible:outline-none focus:ring-1 focus:ring-tinta'

function diasDesdeUltimoDebe(movimientos) {
  const fechas = movimientos.filter((m) => Number(m.debe) > 0).map((m) => m.fecha).sort()
  return fechas.length ? diasHasta(fechas[fechas.length - 1]) : null
}

function mesAnterior(mes) {
  const [y, m] = mes.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

// Total del Debe y del Haber de todos los clientes en un mes.
function totalesDelMes(clientes, mes) {
  let debe = 0
  let haber = 0
  for (const c of clientes) {
    for (const m of c.movimientos) {
      if (!m.fecha.startsWith(mes)) continue
      debe += Number(m.debe)
      haber += Number(m.haber)
    }
  }
  return { debe, haber }
}

// Antigüedad de la deuda en palabras, con un punto de color según urgencia.
function Antiguedad({ dias }) {
  if (dias === null) return null
  const color = dias > 30 ? 'bg-debe' : dias > 7 ? 'bg-aviso' : 'bg-haber'
  const texto = dias === 0 ? 'Último Debe hoy' : dias === 1 ? 'Último Debe ayer' : `Último Debe hace ${dias} días`
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-tinta-tenue">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {texto}
    </span>
  )
}

function FilaEsqueleto() {
  return (
    <div className="px-4 py-4 flex items-center justify-between animate-pulse">
      <div>
        <div className="h-4 w-36 bg-renglon-suave rounded mb-2" />
        <div className="h-3 w-24 bg-renglon-suave rounded" />
      </div>
      <div className="h-5 w-20 bg-renglon-suave rounded" />
    </div>
  )
}

export default function Dashboard({ session }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevasNotas, setNuevasNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [saliendo, setSaliendo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('deben')
  const [toast, showToast] = useToast()

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    setErrorCarga('')
    const { data, error } = await supabase
      .from('clientes')
      .select(`id, nombre, telefono, notas, movimientos (debe, haber, fecha)`)
      .order('nombre')

    if (error) {
      setErrorCarga(mensajeError(error, 'No se pudieron cargar los clientes.'))
    } else {
      const conSaldo = data.map((c) => ({
        ...c,
        saldo: c.movimientos.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0),
        diasDeuda: diasDesdeUltimoDebe(c.movimientos),
      }))
      conSaldo.sort((a, b) => b.saldo - a.saldo)
      setClientes(conSaldo)
    }
    setLoading(false)
  }

  async function crearCliente(e) {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    setGuardando(true)
    setErrorForm('')

    const { error } = await supabase.from('clientes').insert({
      nombre: nuevoNombre.trim(),
      telefono: nuevoTelefono.trim() || null,
      notas: nuevasNotas.trim() || null,
      owner_id: session.user.id,
    })
    setGuardando(false)

    if (error) {
      setErrorForm(mensajeError(error, 'No se pudo guardar el cliente. Probá de nuevo.'))
      return
    }

    setNuevoNombre(''); setNuevoTelefono(''); setNuevasNotas('')
    setModalNuevo(false)
    showToast('Cliente guardado')
    fetchClientes()
  }

  async function handleLogout() {
    setSaliendo(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSaliendo(false)
      showToast(mensajeError(error, 'No se pudo cerrar la sesión. Probá de nuevo.'), 'error')
    }
  }

  if (clienteSeleccionado) {
    return <ClienteDetalle cliente={clienteSeleccionado} onVolver={() => { setClienteSeleccionado(null); fetchClientes() }} />
  }

  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((c) => (tab === 'deben' ? c.saldo > 0 : c.saldo <= 0))

  const totalDeben = clientes.filter((c) => c.saldo > 0).length
  const totalSaldados = clientes.filter((c) => c.saldo <= 0).length
  const montoTotal = clientes.filter((c) => c.saldo > 0).reduce((acc, c) => acc + c.saldo, 0)
  const mesActual = hoyArgentina().slice(0, 7)
  const mesPasado = mesAnterior(mesActual)
  const meses = [
    [MESES[Number(mesActual.slice(5)) - 1], totalesDelMes(clientes, mesActual)],
    [MESES[Number(mesPasado.slice(5)) - 1], totalesDelMes(clientes, mesPasado)],
  ]

  return (
    <div className="min-h-dvh pb-28">
      <header className="px-5 h-16 flex items-center justify-between max-w-2xl mx-auto">
        <span className="flex items-center gap-2.5 font-titulo text-[18px] font-semibold tracking-tight">
          <MarcaT className="h-7 w-7" />
          Asiento Contable
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[13px] text-tinta-tenue">{session.user.email}</span>
          <button
            onClick={handleLogout}
            disabled={saliendo}
            className="text-[15px] text-tinta-suave hover:text-tinta disabled:opacity-50 flex items-center gap-1.5 py-2"
          >
            {saliendo && <Spinner className="w-3.5 h-3.5" />}
            {saliendo ? 'Saliendo...' : 'Salir'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5">
        {errorCarga ? (
          <div className="mt-6"><ErrorCarga mensaje={errorCarga} onReintentar={fetchClientes} /></div>
        ) : (
          <>
            {/* Lo primero: cuánto te deben en total */}
            <section className="pt-4 pb-6">
              <p className="text-[16px] text-tinta-suave">Te deben</p>
              <p className="font-titulo cifras text-[52px] leading-[1.05] font-semibold tracking-tight text-debe">
                {loading ? <span className="text-renglon">$—</span> : formatPesos(montoTotal)}
              </p>
              {!loading && (
                <p className="text-[15px] text-tinta-suave mt-1">
                  {totalDeben === 0
                    ? 'Nadie te debe nada.'
                    : `${totalDeben} ${totalDeben === 1 ? 'cliente con saldo' : 'clientes con saldo'} pendiente`}
                </p>
              )}
            </section>

            {/* El mes como una pequeña cuenta T: Debe a la izquierda, Haber a la derecha */}
            {!loading && (
              <section aria-label="Debe y Haber por mes" className="bg-hoja rounded-2xl border border-renglon mb-6">
                <div className="grid grid-cols-[1fr_auto_auto] text-[15px]">
                  <span />
                  <span className="px-4 pt-3 pb-2 text-right text-[13px] text-tinta-tenue border-b-2 border-tinta">Debe</span>
                  <span className="px-4 pt-3 pb-2 text-right text-[13px] text-tinta-tenue border-b-2 border-l-2 border-tinta">Haber</span>
                  {meses.map(([nombre, t], i) => (
                    <div key={nombre} className="contents">
                      <span className={`pl-4 py-2.5 ${i === 0 ? 'font-medium' : 'text-tinta-suave'}`}>{nombre}</span>
                      <span className="cifras px-4 py-2.5 text-right text-debe">{formatPesos(t.debe)}</span>
                      <span className="cifras px-4 py-2.5 text-right text-haber border-l-2 border-tinta">{formatPesos(t.haber)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Buscador + pestañas */}
            <div className="flex flex-col gap-3 mb-4">
              <input
                type="search"
                placeholder="Buscar cliente"
                aria-label="Buscar cliente"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={campo}
              />
              <div role="tablist" className="grid grid-cols-2 bg-renglon-suave rounded-2xl p-1">
                {[['deben', `Deben (${totalDeben})`], ['saldados', `Saldados (${totalSaldados})`]].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`py-2.5 text-[15px] rounded-xl ${tab === key ? 'bg-hoja font-medium shadow-sm' : 'text-tinta-suave'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de clientes, en renglones */}
            {loading ? (
              <div className="bg-hoja rounded-2xl border border-renglon divide-y divide-renglon-suave">
                <FilaEsqueleto /><FilaEsqueleto /><FilaEsqueleto />
              </div>
            ) : filtrados.length === 0 ? (
              <p className="text-center text-[15px] text-tinta-suave py-12 px-6">
                {busqueda
                  ? `No hay clientes que coincidan con "${busqueda}".`
                  : clientes.length === 0
                    ? 'Todavía no cargaste clientes. Tocá "Nuevo cliente" para empezar.'
                    : tab === 'deben' ? 'Ningún cliente te debe.' : 'No hay clientes saldados.'}
              </p>
            ) : (
              <ul className="bg-hoja rounded-2xl border border-renglon divide-y divide-renglon-suave overflow-hidden">
                {filtrados.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setClienteSeleccionado(c)}
                      className="w-full text-left px-4 py-4 flex items-center justify-between gap-3 hover:bg-papel active:bg-papel"
                    >
                      <span className="min-w-0 flex flex-col gap-1">
                        <span className="text-[17px] font-medium truncate">{c.nombre}</span>
                        {c.saldo > 0 ? <Antiguedad dias={c.diasDeuda} /> : c.telefono && <span className="text-[13px] text-tinta-tenue">{c.telefono}</span>}
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`block font-titulo cifras text-[19px] font-semibold ${c.saldo > 0 ? 'text-debe' : c.saldo < 0 ? 'text-haber' : 'text-tinta-tenue'}`}>
                          {formatPesos(Math.abs(c.saldo))}
                        </span>
                        <span className="block text-[13px] text-tinta-tenue">
                          {c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'a favor' : 'al día'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {/* Acción principal, al alcance del pulgar */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-papel via-papel to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-5">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => { setModalNuevo(true); setErrorForm('') }}
            className="w-full bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium shadow-lg shadow-tinta/20 hover:brightness-125"
          >
            Nuevo cliente
          </button>
        </div>
      </div>

      {modalNuevo && (
        <Hoja titulo="Nuevo cliente" onCerrar={() => setModalNuevo(false)}>
          <form onSubmit={crearCliente} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Nombre
              <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required autoFocus className={campo} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Teléfono (opcional)
              <input type="tel" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className={campo} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Notas (opcional)
              <textarea
                placeholder="Ej: paga a fin de mes"
                value={nuevasNotas}
                onChange={(e) => setNuevasNotas(e.target.value)}
                rows={2}
                className={`${campo} resize-none`}
              />
            </label>

            {errorForm && <p role="alert" className="text-sm text-debe bg-debe-claro rounded-xl px-3.5 py-2.5">{errorForm}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="mt-1 bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium hover:brightness-125 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando && <Spinner />}
              {guardando ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </form>
        </Hoja>
      )}

      <Toast toast={toast} />
    </div>
  )
}
