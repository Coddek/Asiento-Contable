import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClienteDetalle from './ClienteDetalle'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'
import Spinner from './Spinner'
import { useToast } from '../hooks/useToast'

const COLORES_AVATAR = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
]

function colorAvatar(nombre) {
  const suma = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORES_AVATAR[suma % COLORES_AVATAR.length]
}

function iniciales(nombre) {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase()
}

function diasEntre(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = Date.UTC(y, m - 1, d)
  const hoy = new Date()
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.floor((hoyUTC - fecha) / (1000 * 60 * 60 * 24))
}

function diasDesdeUltimoDebito(movimientos) {
  const debitos = movimientos
    .filter(m => Number(m.debe) > 0)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  if (debitos.length === 0) return null
  return diasEntre(debitos[0].fecha)
}

function AgingBadge({ dias }) {
  if (dias === null) return null
  const estilos =
    dias <= 7 ? 'bg-emerald-50 text-emerald-700' :
    dias <= 30 ? 'bg-amber-50 text-amber-700' :
    'bg-rose-50 text-rose-700'
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${estilos}`}>{dias}d</span>
}

function SkeletonRow() {
  return (
    <div className="px-5 py-4 flex items-center gap-3 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-stone-100 shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 w-32 bg-stone-100 rounded mb-2" />
        <div className="h-3 w-20 bg-stone-100 rounded" />
      </div>
      <div className="h-4 w-16 bg-stone-100 rounded" />
    </div>
  )
}

export default function Dashboard({ session }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [saliendo, setSaliendo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('deben')
  const [clienteABorrar, setClienteABorrar] = useState(null)
  const [toast, showToast] = useToast()

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select(`id, nombre, telefono, movimientos (debe, haber, fecha)`)
      .order('nombre')

    if (!error) {
      const conSaldo = data.map(c => ({
        ...c,
        saldo: c.movimientos.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0),
        diasDeuda: diasDesdeUltimoDebito(c.movimientos)
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
      owner_id: session.user.id
    })

    if (error) {
      setErrorForm('No se pudo guardar el cliente. Probá de nuevo.')
      setGuardando(false)
      return
    }

    setNuevoNombre(''); setNuevoTelefono('')
    setModalNuevo(false)
    setGuardando(false)
    showToast('Cliente creado')
    fetchClientes()
  }

  async function confirmarEliminarCliente() {
    const id = clienteABorrar
    setClienteABorrar(null)
    await supabase.from('clientes').delete().eq('id', id)
    showToast('Cliente eliminado')
    fetchClientes()
  }

  async function handleLogout() {
    setSaliendo(true)
    await supabase.auth.signOut()
  }

  if (clienteSeleccionado) {
    return <ClienteDetalle cliente={clienteSeleccionado} onVolver={() => { setClienteSeleccionado(null); fetchClientes() }} />
  }

  const filtrados = clientes
    .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(c => tab === 'deben' ? c.saldo > 0 : c.saldo <= 0)

  const totalDeben = clientes.filter(c => c.saldo > 0).length
  const totalSaldados = clientes.filter(c => c.saldo <= 0).length
  const montoTotal = clientes.filter(c => c.saldo > 0).reduce((acc, c) => acc + c.saldo, 0)

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-[15px] text-stone-900 tracking-tight">Cuentas</span>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-stone-400">{session.user.email}</span>
          <button
            onClick={handleLogout}
            disabled={saliendo}
            className="text-[13px] text-stone-500 hover:text-stone-900 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {saliendo && <Spinner className="w-3.5 h-3.5" />}
            {saliendo ? 'Saliendo...' : 'Salir'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 pb-14">
        {/* Resumen (sin caja, header editorial) */}
        <div className="flex items-end justify-between mb-7 pb-6 border-b border-stone-200">
          <div>
            <p className="text-xs text-stone-400 font-medium mb-1.5 uppercase tracking-wide">Total a cobrar</p>
            <p className="text-[40px] font-semibold text-stone-900 tracking-tight leading-none">
              ${montoTotal.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-600 font-medium">{totalDeben} {totalDeben === 1 ? 'cliente debe' : 'clientes deben'}</p>
            <p className="text-sm text-stone-400">{totalSaldados} saldados</p>
          </div>
        </div>

        {/* Buscador + tabs + nuevo */}
        <div className="flex gap-2 mb-5 items-center flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-full text-sm outline-none bg-white text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            />
          </div>
          <div className="flex bg-stone-100 rounded-full p-[3px]">
            {[['deben', `Deben (${totalDeben})`], ['saldados', `Saldados (${totalSaldados})`]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
                  tab === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setModalNuevo(true); setErrorForm('') }}
            className="bg-stone-900 text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-stone-800 active:scale-[0.97] transition-all whitespace-nowrap"
          >
            + Nuevo
          </button>
        </div>

        {/* Lista plana con separadores */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto mb-3 text-stone-300" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1m0-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </svg>
            <p className="text-stone-400 text-sm">
              {busqueda ? `Sin resultados para "${busqueda}"` : tab === 'deben' ? 'Ningún cliente debe.' : 'Ningún cliente saldado.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
            {filtrados.map(c => (
              <div
                key={c.id}
                onClick={() => setClienteSeleccionado(c)}
                className="group px-5 py-4 flex items-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${colorAvatar(c.nombre)}`}>
                  {iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 truncate">{c.nombre}</p>
                    <AgingBadge dias={c.diasDeuda} />
                  </div>
                  {c.telefono && <p className="text-sm text-stone-400">{c.telefono}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className={`font-semibold text-base ${c.saldo > 0 ? 'text-rose-600' : c.saldo < 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
                      ${Math.abs(c.saldo).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-stone-400">
                      {c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'a favor' : 'saldado'}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setClienteABorrar(c.id) }}
                    className="text-stone-300 hover:text-rose-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar cliente"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal nuevo cliente */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-stone-900 mb-4">Nuevo cliente</h3>
            <form onSubmit={crearCliente} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nombre *"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                required
                className="border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />
              <input
                type="text"
                placeholder="Teléfono (opcional)"
                value={nuevoTelefono}
                onChange={e => setNuevoTelefono(e.target.value)}
                className="border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />

              {errorForm && <p className="text-rose-600 text-sm">{errorForm}</p>}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="flex-1 border border-stone-200 text-stone-600 rounded-full py-3 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-stone-900 text-white rounded-full py-3 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {guardando && <Spinner />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={clienteABorrar !== null}
        title="Eliminar cliente"
        message="Se van a borrar el cliente y todos sus movimientos. Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarCliente}
        onCancel={() => setClienteABorrar(null)}
      />
      <Toast toast={toast} />
    </div>
  )
}
