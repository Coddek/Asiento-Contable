import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ClienteDetalle({ cliente, onVolver }) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)

  // Filtro fechas
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Form movimiento
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('debe')

  useEffect(() => { fetchMovimientos() }, [])

  async function fetchMovimientos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('fecha', { ascending: false })
    if (!error) setMovimientos(data)
    setLoading(false)
  }

  async function cargarMovimiento(e) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) return
    const payload = {
      cliente_id: cliente.id, fecha,
      referencia: referencia.trim() || null,
      debe: tipo === 'debe' ? Number(monto) : 0,
      haber: tipo === 'haber' ? Number(monto) : 0,
    }
    if (modalEditar) {
      await supabase.from('movimientos').update(payload).eq('id', modalEditar.id)
      setModalEditar(null)
    } else {
      await supabase.from('movimientos').insert(payload)
      setModalNuevo(false)
    }
    setMonto(''); setReferencia(''); setTipo('debe')
    setFecha(new Date().toISOString().split('T')[0])
    fetchMovimientos()
  }

  function abrirEditar(m) {
    setFecha(m.fecha)
    setReferencia(m.referencia || '')
    setMonto(Number(m.debe) > 0 ? m.debe : m.haber)
    setTipo(Number(m.debe) > 0 ? 'debe' : 'haber')
    setModalEditar(m)
  }

  async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await supabase.from('movimientos').delete().eq('id', id)
    fetchMovimientos()
  }

  // Filtrado por fechas
  const filtrados = movimientos.filter(m => {
    if (fechaDesde && m.fecha < fechaDesde) return false
    if (fechaHasta && m.fecha > fechaHasta) return false
    return true
  })

  const saldo = movimientos.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0)
  const saldoFiltrado = filtrados.reduce((acc, m) => acc + Number(m.debe) - Number(m.haber), 0)
  const hayFiltro = fechaDesde || fechaHasta

  const modalAbierto = modalNuevo || modalEditar

  function abrirNuevo() {
    setFecha(new Date().toISOString().split('T')[0])
    setReferencia(''); setMonto(''); setTipo('debe')
    setModalNuevo(true)
  }

  function cerrarModal() {
    setModalNuevo(false); setModalEditar(null)
    setMonto(''); setReferencia(''); setTipo('debe')
    setFecha(new Date().toISOString().split('T')[0])
  }

  return (
    <div style={{minHeight:'100vh', background:'#F7F8FA'}}>

      {/* Header */}
      <header style={{background:'#fff', borderBottom:'1px solid #EAECF0', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10}}>
        <button onClick={onVolver} style={{fontSize:'14px', color:'#6B7280', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', padding:0}}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <button onClick={abrirNuevo}
          style={{background:'#111318', color:'#fff', border:'none', borderRadius:'10px', padding:'8px 16px', fontSize:'13px', fontWeight:500, cursor:'pointer'}}>
          + Movimiento
        </button>
      </header>

      <main style={{maxWidth:'600px', margin:'0 auto', padding:'20px 16px 40px'}}>

        {/* Card cliente + saldo */}
        <div style={{background:'#111318', borderRadius:'16px', padding:'24px', marginBottom:'16px', color:'#fff'}}>
          <p style={{fontWeight:600, fontSize:'18px', letterSpacing:'-0.3px'}}>{cliente.nombre}</p>
          {cliente.telefono && <p style={{fontSize:'13px', color:'#6B7280', marginTop:'2px'}}>{cliente.telefono}</p>}
          <div style={{marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #1F2937', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
            <div>
              <p style={{fontSize:'12px', color:'#6B7280', marginBottom:'4px'}}>
                {hayFiltro ? 'Saldo del período' : 'Saldo total'}
              </p>
              <p style={{fontSize:'32px', fontWeight:600, letterSpacing:'-1px', lineHeight:1,
                color: saldo > 0 ? '#E5484D' : saldo < 0 ? '#30A46C' : '#6B7280'}}>
                ${Math.abs(hayFiltro ? saldoFiltrado : saldo).toLocaleString('es-AR')}
              </p>
            </div>
            <p style={{fontSize:'12px', color:'#6B7280', fontWeight:500}}>
              {saldo > 0 ? 'debe' : saldo < 0 ? 'a favor' : 'saldado'}
            </p>
          </div>
        </div>

        {/* Filtro fechas */}
        <div style={{background:'#fff', borderRadius:'12px', padding:'14px 16px', marginBottom:'16px', border:'1px solid #EAECF0'}}>
          <p style={{fontSize:'12px', color:'#6B7280', fontWeight:500, marginBottom:'10px'}}>Filtrar por período</p>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              style={{flex:1, border:'1px solid #EAECF0', borderRadius:'8px', padding:'8px 10px', fontSize:'13px', outline:'none', color:'#111318'}}/>
            <span style={{color:'#9CA3AF', fontSize:'13px'}}>—</span>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              style={{flex:1, border:'1px solid #EAECF0', borderRadius:'8px', padding:'8px 10px', fontSize:'13px', outline:'none', color:'#111318'}}/>
            {hayFiltro && (
              <button onClick={() => { setFechaDesde(''); setFechaHasta('') }}
                style={{color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'4px'}}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Historial */}
        <p style={{fontSize:'12px', color:'#9CA3AF', fontWeight:500, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px'}}>
          {filtrados.length} movimientos{hayFiltro ? ' en el período' : ''}
        </p>

        {loading ? (
          <p style={{color:'#9CA3AF', fontSize:'14px', textAlign:'center', padding:'40px 0'}}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div style={{textAlign:'center', padding:'48px 0'}}>
            <p style={{color:'#9CA3AF', fontSize:'14px'}}>
              {hayFiltro ? 'Sin movimientos en ese período.' : 'Sin movimientos todavía.'}
            </p>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {filtrados.map(m => (
              <div key={m.id}
                style={{background:'#fff', borderRadius:'10px', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #EAECF0'}}>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontSize:'14px', fontWeight:500, color:'#111318', marginBottom:'2px'}}>
                    {m.referencia || <span style={{color:'#D1D5DB'}}>Sin referencia</span>}
                  </p>
                  <p style={{fontSize:'12px', color:'#9CA3AF'}}>
                    {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'})}
                  </p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:'15px', fontWeight:600, letterSpacing:'-0.3px',
                      color: Number(m.debe) > 0 ? '#E5484D' : '#30A46C'}}>
                      {Number(m.debe) > 0 ? '+' : '-'}${Number(Number(m.debe) > 0 ? m.debe : m.haber).toLocaleString('es-AR')}
                    </p>
                    <p style={{fontSize:'11px', color:'#9CA3AF', fontWeight:500}}>
                      {Number(m.debe) > 0 ? 'debe' : 'pagó'}
                    </p>
                  </div>
                  <div style={{display:'flex', gap:'4px'}}>
                    <button onClick={() => abrirEditar(m)}
                      style={{color:'#D1D5DB', background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:'4px', fontSize:'14px', lineHeight:1}}
                      onMouseEnter={e => e.currentTarget.style.color='#6B7280'}
                      onMouseLeave={e => e.currentTarget.style.color='#D1D5DB'}>
                      ✎
                    </button>
                    <button onClick={() => eliminarMovimiento(m.id)}
                      style={{color:'#D1D5DB', background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:'4px', fontSize:'18px', lineHeight:1}}
                      onMouseEnter={e => e.currentTarget.style.color='#E5484D'}
                      onMouseLeave={e => e.currentTarget.style.color='#D1D5DB'}>
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal movimiento (nuevo o editar) */}
      {modalAbierto && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', zIndex:50}}>
          <div style={{background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'360px'}}>
            <h3 style={{fontWeight:600, fontSize:'16px', color:'#111318', marginBottom:'16px'}}>
              {modalEditar ? 'Editar movimiento' : 'Nuevo movimiento'}
            </h3>
            <form onSubmit={cargarMovimiento} style={{display:'flex', flexDirection:'column', gap:'10px'}}>

              {/* Toggle debe / pagó */}
              <div style={{display:'flex', background:'#F3F4F6', borderRadius:'8px', padding:'3px'}}>
                {[['debe','Debe'],['haber','Pagó']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setTipo(key)}
                    style={{flex:1, padding:'8px 0', fontSize:'13px', fontWeight:500, borderRadius:'6px', border:'none', cursor:'pointer', transition:'all 0.15s',
                      background: tipo === key ? (key === 'debe' ? '#E5484D' : '#30A46C') : 'transparent',
                      color: tipo === key ? '#fff' : '#6B7280'
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              <input type="number" placeholder="Monto *" value={monto} onChange={e => setMonto(e.target.value)} min="0.01" step="0.01" required
                style={{border:'1px solid #EAECF0', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', outline:'none', color:'#111318'}}/>
              <input type="text" placeholder="Referencia (ej: Nike talle 42)" value={referencia} onChange={e => setReferencia(e.target.value)}
                style={{border:'1px solid #EAECF0', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', outline:'none', color:'#111318'}}/>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                style={{border:'1px solid #EAECF0', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', outline:'none', color:'#111318'}}/>

              <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                <button type="button" onClick={cerrarModal}
                  style={{flex:1, border:'1px solid #EAECF0', background:'#fff', color:'#6B7280', borderRadius:'8px', padding:'11px', fontSize:'14px', cursor:'pointer'}}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{flex:1, background:'#111318', color:'#fff', border:'none', borderRadius:'8px', padding:'11px', fontSize:'14px', fontWeight:500, cursor:'pointer'}}>
                  {modalEditar ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}