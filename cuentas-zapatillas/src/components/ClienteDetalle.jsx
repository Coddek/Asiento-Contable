import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'
import Spinner from './Spinner'
import { useToast } from '../hooks/useToast'
import { hoyArgentina } from '../lib/fecha'
import { generarImagen, compartirArchivo } from '../lib/compartirImagen'
import EstadoCuenta from './EstadoCuenta'
import { armarEstado } from '../lib/estadoCuenta'

const PAGE_SIZE = 20

function SkeletonRow() {
  return (
    <div className="px-5 py-4 flex justify-between items-center animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="h-3.5 w-40 bg-stone-100 rounded mb-2" />
        <div className="h-3 w-16 bg-stone-100 rounded" />
      </div>
      <div className="h-4 w-14 bg-stone-100 rounded" />
    </div>
  )
}

export default function ClienteDetalle({ cliente: clienteInicial, onVolver }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [modalCliente, setModalCliente] = useState(false)
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', notas: '' })
  const [borrandoCliente, setBorrandoCliente] = useState(false)
  // Estado de cuenta: se arma recién al tocar el botón (ver compartirImagen.js)
  const estadoRef = useRef(null)
  const [estado, setEstado] = useState(null)
  const [preparando, setPreparando] = useState(false)
  const [imagenLista, setImagenLista] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(false)
  const [saldo, setSaldo] = useState(0)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [movimientoABorrar, setMovimientoABorrar] = useState(null)
  const [toast, showToast] = useToast()

  // Filtro fechas
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Form movimiento
  const [fecha, setFecha] = useState(hoyArgentina())
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('debe')

  useEffect(() => {
    cargarTodo()
  }, [fechaDesde, fechaHasta])

  function baseQuery(query) {
    query = query.eq('cliente_id', cliente.id)
    if (fechaDesde) query = query.gte('fecha', fechaDesde)
    if (fechaHasta) query = query.lte('fecha', fechaHasta)
    return query
  }

  async function cargarTodo() {
    setLoading(true)
    await Promise.all([fetchSaldo(), fetchMovimientos(0)])
    setLoading(false)
  }

  async function fetchSaldo() {
    const { data, error } = await baseQuery(supabase.from('movimientos').select('debe, haber'))
    if (!error) {
      setSaldo(data.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0))
    }
  }

  async function fetchMovimientos(offset) {
    const { data, error } = await baseQuery(
      supabase.from('movimientos').select('id, fecha, referencia, debe, haber')
    )
      .order('fecha', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error) {
      setMovimientos(prev => offset === 0 ? data : [...prev, ...data])
      setHayMas(data.length === PAGE_SIZE)
    }
  }

  async function cargarMas() {
    setCargandoMas(true)
    await fetchMovimientos(movimientos.length)
    setCargandoMas(false)
  }

  async function cargarMovimiento(e) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)
    setErrorForm('')

    const payload = {
      cliente_id: cliente.id, fecha,
      referencia: referencia.trim() || null,
      debe: tipo === 'debe' ? Number(monto) : 0,
      haber: tipo === 'haber' ? Number(monto) : 0,
    }

    const editando = !!modalEditar
    const { error } = editando
      ? await supabase.from('movimientos').update(payload).eq('id', modalEditar.id)
      : await supabase.from('movimientos').insert(payload)

    if (error) {
      setErrorForm('No se pudo guardar el movimiento. Probá de nuevo.')
      setGuardando(false)
      return
    }

    cerrarModal()
    setImagenLista(null)
    showToast(editando ? 'Movimiento actualizado' : 'Movimiento agregado')
    cargarTodo()
  }

  function abrirEditar(m) {
    setFecha(m.fecha)
    setReferencia(m.referencia || '')
    setMonto(Number(m.debe) > 0 ? m.debe : m.haber)
    setTipo(Number(m.debe) > 0 ? 'debe' : 'haber')
    setErrorForm('')
    setModalEditar(m)
  }

  async function confirmarEliminarMovimiento() {
    const id = movimientoABorrar
    setMovimientoABorrar(null)
    const { error } = await supabase.from('movimientos').delete().eq('id', id)
    if (error) {
      showToast('No se pudo eliminar el movimiento', 'error')
      return
    }
    showToast('Movimiento eliminado')
    setImagenLista(null)
    cargarTodo()
  }

  function abrirEditarCliente() {
    setFormCliente({ nombre: cliente.nombre, telefono: cliente.telefono || '', notas: cliente.notas || '' })
    setErrorForm('')
    setModalCliente(true)
  }

  async function guardarCliente(e) {
    e.preventDefault()
    if (!formCliente.nombre.trim()) return
    setGuardando(true)
    setErrorForm('')
    const cambios = {
      nombre: formCliente.nombre.trim(),
      telefono: formCliente.telefono.trim() || null,
      notas: formCliente.notas.trim() || null,
    }
    const { error } = await supabase.from('clientes').update(cambios).eq('id', cliente.id)
    setGuardando(false)
    if (error) {
      setErrorForm('No se pudo guardar. Probá de nuevo.')
      return
    }
    setCliente({ ...cliente, ...cambios })
    setImagenLista(null)
    setModalCliente(false)
    showToast('Cliente actualizado')
  }

  async function eliminarCliente() {
    setBorrandoCliente(false)
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      showToast('No se pudo eliminar el cliente', 'error')
      return
    }
    onVolver()
  }

  // Si la imagen ya está armada (segundo toque en iPhone), la manda directo.
  // Si no, trae todos los movimientos (sin el filtro de fechas), dibuja el
  // estado fuera de pantalla y en el efecto de abajo le saca la foto.
  async function compartirEstado() {
    if (imagenLista) {
      avisar(await compartirArchivo(imagenLista))
      return
    }
    setPreparando(true)
    const { data, error } = await supabase
      .from('movimientos')
      .select('fecha, referencia, debe, haber, created_at')
      .eq('cliente_id', cliente.id)
    if (error) {
      setPreparando(false)
      showToast('No se pudo armar el estado de cuenta', 'error')
      return
    }
    setEstado({ ...armarEstado(data), fecha: hoyArgentina() })
  }

  useEffect(() => {
    if (!estado || !preparando || !estadoRef.current) return
    const nombre = `estado-de-cuenta-${cliente.nombre.trim().toLowerCase().replace(/\s+/g, '-')}.png`
    generarImagen(estadoRef.current, nombre)
      .then(async (archivo) => {
        setImagenLista(archivo)
        setPreparando(false)
        avisar(await compartirArchivo(archivo))
      })
      .catch(() => {
        setPreparando(false)
        showToast('No se pudo armar la imagen', 'error')
      })
    // Solo cuando llegan datos nuevos del estado de cuenta (lo dispara compartirEstado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  function avisar(resultado) {
    if (resultado === 'descargada') showToast('Imagen descargada')
    if (resultado === 'reintentar') showToast('Imagen lista: tocá "Enviar imagen"')
    if (resultado === 'error') showToast('No se pudo abrir el menú de compartir', 'error')
  }

  const hayFiltro = fechaDesde || fechaHasta
  const modalAbierto = modalNuevo || modalEditar

  function abrirNuevo() {
    setFecha(hoyArgentina())
    setReferencia(''); setMonto(''); setTipo('debe')
    setErrorForm('')
    setModalNuevo(true)
  }

  function cerrarModal() {
    setModalNuevo(false); setModalEditar(null); setGuardando(false)
    setMonto(''); setReferencia(''); setTipo('debe')
    setFecha(hoyArgentina())
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onVolver} className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Volver
        </button>
        <button onClick={abrirNuevo} className="bg-stone-900 text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-stone-800 active:scale-[0.97] transition-all">
          + Movimiento
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 pb-14">
        {/* Cliente + saldo (header editorial, sin caja) */}
        <div className="flex items-end justify-between mb-6 pb-6 border-b border-stone-200">
          <div className="min-w-0">
            <p className="font-semibold text-xl text-stone-900 tracking-tight">{cliente.nombre}</p>
            {cliente.telefono && <p className="text-sm text-stone-400 mt-0.5">{cliente.telefono}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">{hayFiltro ? 'Saldo del período' : 'Saldo total'}</p>
            <p className={`text-3xl font-semibold tracking-tight leading-none ${saldo > 0 ? 'text-rose-600' : saldo < 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
              ${Math.abs(saldo).toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {cliente.notas && (
          <p className="text-sm text-stone-600 bg-white border border-stone-200 rounded-2xl px-4 py-3 mb-4 whitespace-pre-line">
            {cliente.notas}
          </p>
        )}

        {/* Acciones del cliente */}
        <div className="mb-6">
          <button
            onClick={compartirEstado}
            disabled={preparando}
            className="w-full bg-white border border-stone-200 text-stone-900 rounded-full px-4 py-2.5 text-[13px] font-medium hover:bg-stone-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {preparando && <Spinner className="w-3.5 h-3.5" />}
            {preparando ? 'Preparando...' : imagenLista ? 'Enviar imagen' : 'Compartir estado de cuenta'}
          </button>
          <div className="flex justify-center gap-4 mt-1">
            <button onClick={abrirEditarCliente} className="text-[13px] text-stone-500 hover:text-stone-900 px-2 py-2 transition-colors">
              Editar cliente
            </button>
            <button onClick={() => setBorrandoCliente(true)} className="text-[13px] text-stone-400 hover:text-rose-600 px-2 py-2 transition-colors">
              Eliminar cliente
            </button>
          </div>
        </div>

        {/* Filtro fechas — fila liviana, sin tarjeta */}
        <div className="flex items-center gap-2 mb-5 text-sm">
          <span className="hidden sm:inline text-stone-400 text-xs shrink-0 uppercase tracking-wide">Período</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} aria-label="Desde"
            className="min-w-0 flex-1 border border-stone-200 rounded-full px-3 py-1.5 text-[13px] outline-none text-stone-900 bg-white transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300" />
          <span className="text-stone-300">—</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} aria-label="Hasta"
            className="min-w-0 flex-1 border border-stone-200 rounded-full px-3 py-1.5 text-[13px] outline-none text-stone-900 bg-white transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300" />
          {hayFiltro && (
            <button onClick={() => { setFechaDesde(''); setFechaHasta('') }}
              className="text-stone-400 hover:text-stone-600 text-lg leading-none p-1 bg-transparent border-none cursor-pointer transition-colors">
              ×
            </button>
          )}
        </div>

        {/* Historial */}
        <p className="text-xs text-stone-400 font-medium mb-2.5 uppercase tracking-wide">
          {movimientos.length} movimiento{movimientos.length === 1 ? '' : 's'}{hayMas ? '+' : ''}{hayFiltro ? ' en el período' : ''}
        </p>

        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto mb-3 text-stone-300" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 17V7m6 10v-4M3 7l4-4 4 4M3 7h18M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
            </svg>
            <p className="text-stone-400 text-sm">
              {hayFiltro ? 'Sin movimientos en ese período.' : 'Sin movimientos todavía.'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
              {movimientos.map(m => (
                <div key={m.id} className="group px-5 py-4 flex justify-between items-center hover:bg-stone-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 mb-0.5">
                      {m.referencia || <span className="text-stone-300">Sin referencia</span>}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-[15px] font-semibold tracking-tight ${Number(m.debe) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {Number(m.debe) > 0 ? '+' : '-'}${Number(Number(m.debe) > 0 ? m.debe : m.haber).toLocaleString('es-AR')}
                      </p>
                      <p className="text-[11px] text-stone-400 font-medium">
                        {Number(m.debe) > 0 ? 'debe' : 'pagó'}
                      </p>
                    </div>
                    {/* Siempre visibles: en el celu no hay "pasar el mouse" */}
                    <div className="flex gap-0.5">
                      <button onClick={() => abrirEditar(m)} aria-label="Editar movimiento" className="text-stone-400 hover:text-stone-700 p-2 bg-transparent border-none cursor-pointer text-sm">
                        ✎
                      </button>
                      <button onClick={() => setMovimientoABorrar(m.id)} aria-label="Eliminar movimiento" className="text-stone-400 hover:text-rose-600 p-2 bg-transparent border-none cursor-pointer text-lg leading-none">
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hayMas && (
              <button
                onClick={cargarMas}
                disabled={cargandoMas}
                className="w-full mt-3 py-2.5 text-sm text-stone-500 hover:text-stone-900 border border-stone-200 rounded-full bg-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {cargandoMas && <Spinner className="w-3.5 h-3.5" />}
                {cargandoMas ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </main>

      {/* Modal movimiento (nuevo o editar) */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-stone-900 mb-4">
              {modalEditar ? 'Editar movimiento' : 'Nuevo movimiento'}
            </h3>
            <form onSubmit={cargarMovimiento} className="flex flex-col gap-2.5">
              {/* Toggle debe / pagó */}
              <div className="flex bg-stone-100 rounded-full p-[3px]">
                {[['debe', 'Debe'], ['haber', 'Pagó']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTipo(key)}
                    className={`flex-1 py-2 text-[13px] font-medium rounded-full transition-colors ${
                      tipo === key
                        ? key === 'debe' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        : 'text-stone-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                type="number"
                placeholder="Monto *"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                min="0.01"
                step="0.01"
                required
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />
              <input
                type="text"
                placeholder="Referencia (ej: Nike talle 42)"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />

              {errorForm && <p className="text-rose-600 text-sm">{errorForm}</p>}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 border border-stone-200 bg-white text-stone-500 rounded-full py-2.5 text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-stone-900 text-white rounded-full py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {guardando && <Spinner className="w-3.5 h-3.5" />}
                  {guardando ? 'Guardando...' : modalEditar ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCliente && (
        <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-stone-900 mb-4">Editar cliente</h3>
            <form onSubmit={guardarCliente} className="flex flex-col gap-2.5">
              <input
                type="text"
                placeholder="Nombre *"
                value={formCliente.nombre}
                onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                required
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={formCliente.telefono}
                onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />
              <textarea
                placeholder="Notas (ej: paga los viernes, talle 42)"
                value={formCliente.notas}
                onChange={e => setFormCliente({ ...formCliente, notas: e.target.value })}
                rows={3}
                className="border border-stone-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none text-stone-900 resize-none transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
              />

              {errorForm && <p className="text-rose-600 text-sm">{errorForm}</p>}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setModalCliente(false)}
                  className="flex-1 border border-stone-200 bg-white text-stone-500 rounded-full py-2.5 text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-stone-900 text-white rounded-full py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {guardando && <Spinner className="w-3.5 h-3.5" />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={borrandoCliente}
        title="Eliminar cliente"
        message="Se van a borrar el cliente y todos sus movimientos. Esta acción no se puede deshacer."
        onConfirm={eliminarCliente}
        onCancel={() => setBorrandoCliente(false)}
      />

      {estado && <EstadoCuenta cliente={cliente} estado={estado} fecha={estado.fecha} ref={estadoRef} />}

      <ConfirmDialog
        open={movimientoABorrar !== null}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarMovimiento}
        onCancel={() => setMovimientoABorrar(null)}
      />
      <Toast toast={toast} />
    </div>
  )
}
