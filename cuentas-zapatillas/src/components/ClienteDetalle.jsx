import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'
import Spinner from './Spinner'
import Hoja from './Hoja'
import ErrorCarga from './ErrorCarga'
import { useToast } from '../hooks/useToast'
import { hoyArgentina, formatFecha, formatPesos } from '../lib/fecha'
import { mensajeError } from '../lib/errores'
import { generarImagen, compartirArchivo } from '../lib/compartirImagen'
import EstadoCuenta from './EstadoCuenta'
import { armarEstado } from '../lib/estadoCuenta'

const PAGE_SIZE = 20

const campo =
  'w-full bg-hoja border border-renglon rounded-2xl px-4 py-3.5 text-[16px] outline-none placeholder:text-tinta-tenue focus:border-tinta focus-visible:outline-none focus:ring-1 focus:ring-tinta'

// Un renglón de la cuenta T: el movimiento va del lado del Debe (izquierda) o
// del Haber (derecha), como en el libro. Tocarlo abre la edición.
function Renglon({ m, onTocar }) {
  const esDebe = Number(m.debe) > 0
  const contenido = (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span className={`font-titulo cifras text-[17px] font-semibold ${esDebe ? 'text-debe' : 'text-haber'}`}>
        {formatPesos(esDebe ? m.debe : m.haber)}
      </span>
      {m.referencia && <span className="text-[14px] text-tinta leading-snug line-clamp-2 break-words">{m.referencia}</span>}
      <span className="text-[12px] text-tinta-tenue">{formatFecha(m.fecha)}</span>
    </span>
  )
  return (
    <li>
      <button
        onClick={() => onTocar(m)}
        aria-label={`${esDebe ? 'Debe' : 'Haber'} ${formatPesos(esDebe ? m.debe : m.haber)}${m.referencia ? `, ${m.referencia}` : ''}, ${formatFecha(m.fecha)}. Tocar para editar`}
        className="w-full grid grid-cols-2 text-left hover:bg-papel active:bg-papel"
      >
        <span className="px-3 py-3 border-r-2 border-tinta min-w-0">{esDebe && contenido}</span>
        <span className="px-3 py-3 min-w-0 text-right flex justify-end">{!esDebe && contenido}</span>
      </button>
    </li>
  )
}

export default function ClienteDetalle({ cliente: clienteInicial, onVolver }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(false)
  const [saldo, setSaldo] = useState(0)
  const [toast, showToast] = useToast()

  // Hoja de movimiento: null | { tipo, editando }
  const [hojaMov, setHojaMov] = useState(null)
  const [fecha, setFecha] = useState(hoyArgentina())
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('debe')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [movimientoABorrar, setMovimientoABorrar] = useState(null)

  // Datos del cliente
  const [hojaCliente, setHojaCliente] = useState(false)
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', notas: '' })
  const [borrandoCliente, setBorrandoCliente] = useState(false)

  // Filtro de fechas (plegado por defecto)
  const [verFiltro, setVerFiltro] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Estado de cuenta: se arma recién al tocar el botón (ver compartirImagen.js)
  const estadoRef = useRef(null)
  const [estado, setEstado] = useState(null)
  const [preparando, setPreparando] = useState(false)
  const [imagenLista, setImagenLista] = useState(null)

  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta])

  function baseQuery(query) {
    query = query.eq('cliente_id', cliente.id)
    if (fechaDesde) query = query.gte('fecha', fechaDesde)
    if (fechaHasta) query = query.lte('fecha', fechaHasta)
    return query
  }

  async function cargarTodo() {
    setLoading(true)
    setErrorCarga('')
    const [e1, e2] = await Promise.all([fetchSaldo(), fetchMovimientos(0)])
    if (e1 || e2) setErrorCarga(mensajeError(e1 || e2, 'No se pudieron cargar los movimientos.'))
    setLoading(false)
  }

  async function fetchSaldo() {
    const { data, error } = await baseQuery(supabase.from('movimientos').select('debe, haber'))
    if (error) return error
    setSaldo(data.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0))
    return null
  }

  async function fetchMovimientos(offset) {
    const { data, error } = await baseQuery(
      supabase.from('movimientos').select('id, fecha, referencia, debe, haber, created_at')
    )
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) return error
    setMovimientos((prev) => (offset === 0 ? data : [...prev, ...data]))
    setHayMas(data.length === PAGE_SIZE)
    return null
  }

  async function cargarMas() {
    setCargandoMas(true)
    const error = await fetchMovimientos(movimientos.length)
    if (error) showToast(mensajeError(error, 'No se pudieron cargar más movimientos.'), 'error')
    setCargandoMas(false)
  }

  function abrirNuevo(t) {
    setFecha(hoyArgentina())
    setReferencia(''); setMonto(''); setTipo(t)
    setErrorForm('')
    setHojaMov({ editando: null })
  }

  function abrirEditar(m) {
    setFecha(m.fecha)
    setReferencia(m.referencia || '')
    setMonto(String(Number(m.debe) > 0 ? m.debe : m.haber))
    setTipo(Number(m.debe) > 0 ? 'debe' : 'haber')
    setErrorForm('')
    setHojaMov({ editando: m })
  }

  async function guardarMovimiento(e) {
    e.preventDefault()
    const valor = Number(String(monto).replace(',', '.'))
    if (!valor || valor <= 0) {
      setErrorForm('Ingresá un monto mayor a cero.')
      return
    }
    if (!fecha) {
      setErrorForm('Elegí la fecha del movimiento.')
      return
    }
    setGuardando(true)
    setErrorForm('')

    const payload = {
      cliente_id: cliente.id,
      fecha,
      referencia: referencia.trim() || null,
      debe: tipo === 'debe' ? valor : 0,
      haber: tipo === 'haber' ? valor : 0,
    }
    const editando = hojaMov.editando
    const { error } = editando
      ? await supabase.from('movimientos').update(payload).eq('id', editando.id)
      : await supabase.from('movimientos').insert(payload)
    setGuardando(false)

    if (error) {
      setErrorForm(mensajeError(error, 'No se pudo guardar el movimiento. Probá de nuevo.'))
      return
    }
    setHojaMov(null)
    setImagenLista(null)
    showToast(editando ? 'Movimiento actualizado' : tipo === 'debe' ? 'Debe guardado' : 'Haber guardado')
    cargarTodo()
  }

  async function confirmarEliminarMovimiento() {
    const id = movimientoABorrar
    setMovimientoABorrar(null)
    setHojaMov(null)
    const { error } = await supabase.from('movimientos').delete().eq('id', id)
    if (error) {
      showToast(mensajeError(error, 'No se pudo eliminar el movimiento. Probá de nuevo.'), 'error')
      return
    }
    setImagenLista(null)
    showToast('Movimiento eliminado')
    cargarTodo()
  }

  function abrirEditarCliente() {
    setFormCliente({ nombre: cliente.nombre, telefono: cliente.telefono || '', notas: cliente.notas || '' })
    setErrorForm('')
    setHojaCliente(true)
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
      setErrorForm(mensajeError(error, 'No se pudieron guardar los cambios. Probá de nuevo.'))
      return
    }
    setCliente({ ...cliente, ...cambios })
    setImagenLista(null)
    setHojaCliente(false)
    showToast('Cambios guardados')
  }

  async function eliminarCliente() {
    setBorrandoCliente(false)
    setHojaCliente(false)
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      showToast(mensajeError(error, 'No se pudo eliminar el cliente. Probá de nuevo.'), 'error')
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
      showToast(mensajeError(error, 'No se pudo armar el estado de cuenta.'), 'error')
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
        showToast('No se pudo armar la imagen. Probá de nuevo.', 'error')
      })
    // Solo cuando llegan datos nuevos del estado de cuenta (lo dispara compartirEstado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  function avisar(resultado) {
    if (resultado === 'descargada') showToast('Imagen descargada')
    if (resultado === 'reintentar') showToast('La imagen está lista: tocá "Enviar imagen"')
    if (resultado === 'error') showToast('No se pudo abrir el menú para compartir. Probá de nuevo.', 'error')
  }

  const hayFiltro = fechaDesde || fechaHasta
  const debe = saldo > 0.005
  const aFavor = saldo < -0.005

  return (
    <div className="min-h-dvh pb-28">
      <header className="px-5 h-16 flex items-center justify-between max-w-2xl mx-auto">
        <button onClick={onVolver} className="flex items-center gap-1.5 text-[15px] text-tinta-suave hover:text-tinta py-2 -ml-1">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          Clientes
        </button>
        <button onClick={abrirEditarCliente} className="text-[15px] text-tinta-suave hover:text-tinta py-2">
          Editar
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-5">
        <section className="pt-2 pb-5">
          <h1 className="font-titulo text-[30px] font-semibold leading-tight tracking-tight break-words">{cliente.nombre}</h1>
          {cliente.telefono && (
            <a href={`tel:${cliente.telefono.replace(/[^\d+]/g, '')}`} className="inline-block text-[15px] text-tinta-suave underline underline-offset-4 decoration-renglon mt-1">
              {cliente.telefono}
            </a>
          )}
          {cliente.notas && (
            <p className="mt-3 pl-3 border-l-2 border-renglon text-[15px] text-tinta-suave whitespace-pre-line">{cliente.notas}</p>
          )}

          <p className="mt-5 text-[15px] text-tinta-suave">
            {hayFiltro ? 'Saldo del período' : debe ? 'Debe' : aFavor ? 'Tiene a favor' : 'Está al día'}
          </p>
          <p className={`font-titulo cifras text-[44px] leading-[1.05] font-semibold tracking-tight ${debe ? 'text-debe' : aFavor ? 'text-haber' : 'text-tinta-tenue'}`}>
            {loading ? <span className="text-renglon">$—</span> : formatPesos(Math.abs(saldo))}
          </p>

          <button
            onClick={compartirEstado}
            disabled={preparando}
            className="mt-5 w-full bg-hoja border border-renglon rounded-2xl py-3.5 text-[15px] font-medium hover:border-tinta disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {preparando && <Spinner />}
            {preparando ? 'Preparando la imagen...' : imagenLista ? 'Enviar imagen' : 'Compartir estado de cuenta'}
          </button>
        </section>

        {/* Filtro por fechas, plegado para no ocupar lugar */}
        <div className="mb-3">
          <button
            onClick={() => setVerFiltro(!verFiltro)}
            aria-expanded={verFiltro || !!hayFiltro}
            className="text-[14px] text-tinta-suave underline underline-offset-4 decoration-renglon py-1"
          >
            {hayFiltro ? 'Filtrando por fechas' : 'Filtrar por fechas'}
          </button>
          {(verFiltro || hayFiltro) && (
            <div className="flex items-center gap-2 mt-2">
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} aria-label="Desde" className={`${campo} min-w-0 flex-1 py-2.5 text-[15px]`} />
              <span className="text-tinta-tenue" aria-hidden="true">a</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} aria-label="Hasta" className={`${campo} min-w-0 flex-1 py-2.5 text-[15px]`} />
              {hayFiltro && (
                <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} className="text-[14px] text-tinta-suave px-1 py-2 shrink-0">
                  Quitar
                </button>
              )}
            </div>
          )}
        </div>

        {/* La cuenta T */}
        {errorCarga ? (
          <ErrorCarga mensaje={errorCarga} onReintentar={cargarTodo} />
        ) : (
          <section aria-label="Movimientos" className="bg-hoja rounded-2xl border border-renglon overflow-hidden">
            <div className="grid grid-cols-2 border-b-2 border-tinta">
              <span className="px-3 pt-3 pb-2 font-titulo text-[17px] font-semibold border-r-2 border-tinta">Debe</span>
              <span className="px-3 pt-3 pb-2 font-titulo text-[17px] font-semibold text-right">Haber</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 animate-pulse">
                <span className="h-40 border-r-2 border-tinta" />
                <span />
              </div>
            ) : movimientos.length === 0 ? (
              <div className="grid grid-cols-2">
                <span className="border-r-2 border-tinta h-6" />
                <span />
                <p className="col-span-2 text-center text-[15px] text-tinta-suave px-6 pb-8 pt-2 bg-hoja">
                  {hayFiltro ? 'No hay movimientos en esas fechas.' : 'Todavía no hay movimientos. Usá los botones de abajo para cargar el primero.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-renglon-suave">
                {movimientos.map((m) => <Renglon key={m.id} m={m} onTocar={abrirEditar} />)}
              </ul>
            )}
          </section>
        )}

        {hayMas && !errorCarga && (
          <button
            onClick={cargarMas}
            disabled={cargandoMas}
            className="w-full mt-3 py-3 text-[15px] text-tinta-suave border border-renglon rounded-2xl bg-hoja disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {cargandoMas && <Spinner className="w-3.5 h-3.5" />}
            {cargandoMas ? 'Cargando...' : 'Ver movimientos anteriores'}
          </button>
        )}
      </main>

      {/* Acciones principales, al alcance del pulgar */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-papel via-papel to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-5">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          <button onClick={() => abrirNuevo('debe')} className="bg-debe text-white rounded-2xl py-4 text-[16px] font-medium shadow-lg shadow-debe/20 hover:brightness-110">
            + Debe
          </button>
          <button onClick={() => abrirNuevo('haber')} className="bg-haber text-white rounded-2xl py-4 text-[16px] font-medium shadow-lg shadow-haber/20 hover:brightness-110">
            + Haber
          </button>
        </div>
      </div>

      {hojaMov && (
        <Hoja titulo={hojaMov.editando ? 'Editar movimiento' : tipo === 'debe' ? 'Nuevo Debe' : 'Nuevo Haber'} onCerrar={() => setHojaMov(null)}>
          <form onSubmit={guardarMovimiento} className="flex flex-col gap-3">
            <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 bg-renglon-suave rounded-2xl p-1">
              {[['debe', 'Debe', 'bg-debe'], ['haber', 'Haber', 'bg-haber']].map(([key, label, color]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={tipo === key}
                  onClick={() => setTipo(key)}
                  className={`py-2.5 text-[15px] rounded-xl font-medium ${tipo === key ? `${color} text-white` : 'text-tinta-suave'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-tinta-tenue -mt-1">
              {tipo === 'debe' ? 'Lo que el cliente se lleva y queda debiendo.' : 'Lo que el cliente paga.'}
            </p>

            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Monto
              <input
                type="text"
                inputMode="decimal"
                placeholder="$ 0"
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
                autoFocus={!hojaMov.editando}
                className={`${campo} font-titulo cifras text-[26px] font-semibold py-3`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Detalle (opcional)
              <input
                type="text"
                placeholder={tipo === 'debe' ? 'Ej: compra del sábado' : 'Ej: transferencia'}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className={campo}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
            </label>

            {errorForm && <p role="alert" className="text-sm text-debe bg-debe-claro rounded-xl px-3.5 py-2.5">{errorForm}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="mt-1 bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium hover:brightness-125 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando && <Spinner />}
              {guardando ? 'Guardando...' : hojaMov.editando ? 'Guardar cambios' : `Guardar ${tipo === 'debe' ? 'Debe' : 'Haber'}`}
            </button>
            {hojaMov.editando && (
              <button type="button" onClick={() => setMovimientoABorrar(hojaMov.editando.id)} className="py-3 text-[15px] text-debe">
                Eliminar movimiento
              </button>
            )}
          </form>
        </Hoja>
      )}

      {hojaCliente && (
        <Hoja titulo="Datos del cliente" onCerrar={() => setHojaCliente(false)}>
          <form onSubmit={guardarCliente} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Nombre
              <input type="text" value={formCliente.nombre} onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })} required className={campo} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Teléfono (opcional)
              <input type="tel" value={formCliente.telefono} onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })} className={campo} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
              Notas (opcional)
              <textarea
                placeholder="Ej: paga a fin de mes"
                value={formCliente.notas}
                onChange={(e) => setFormCliente({ ...formCliente, notas: e.target.value })}
                rows={3}
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
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => setBorrandoCliente(true)} className="py-3 text-[15px] text-debe">
              Eliminar cliente
            </button>
          </form>
        </Hoja>
      )}

      <ConfirmDialog
        open={borrandoCliente}
        title="¿Eliminar este cliente?"
        message="Se borran el cliente y todos sus movimientos. No se puede deshacer."
        confirmLabel="Eliminar cliente"
        onConfirm={eliminarCliente}
        onCancel={() => setBorrandoCliente(false)}
      />

      <ConfirmDialog
        open={movimientoABorrar !== null}
        title="¿Eliminar este movimiento?"
        message="El saldo del cliente se recalcula sin él. No se puede deshacer."
        confirmLabel="Eliminar movimiento"
        onConfirm={confirmarEliminarMovimiento}
        onCancel={() => setMovimientoABorrar(null)}
      />

      {estado && <EstadoCuenta cliente={cliente} estado={estado} fecha={estado.fecha} ref={estadoRef} />}

      <Toast toast={toast} />
    </div>
  )
}
