import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClienteDetalle from './ClienteDetalle'

function diasDesdeUltimoDebito(movimientos) {
  const debitos = movimientos
    .filter(m => Number(m.debe) > 0)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  if (debitos.length === 0) return null
  const ultima = new Date(debitos[0].fecha + 'T12:00:00')
  const diff = Math.floor((new Date() - ultima) / (1000 * 60 * 60 * 24))
  return diff
}

function AgingBadge({ dias }) {
  if (dias === null) return null
  if (dias <= 7)  return <span style={{fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:'#DCFCE7', color:'#15803D', fontWeight:500}}>{dias}d</span>
  if (dias <= 30) return <span style={{fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:'#FEF9C3', color:'#854D0E', fontWeight:500}}>{dias}d</span>
  return <span style={{fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:'#FFE4E6', color:'#BE123C', fontWeight:500}}>{dias}d</span>
}

export default function Dashboard({ session }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('deben')

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
    const { error } = await supabase.from('clientes').insert({
      nombre: nuevoNombre.trim(),
      telefono: nuevoTelefono.trim() || null,
      owner_id: session.user.id
    })
    if (!error) {
      setNuevoNombre(''); setNuevoTelefono('')
      setModalNuevo(false); fetchClientes()
    }
  }

  async function eliminarCliente(id, e) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este cliente y todos sus movimientos?')) return
    await supabase.from('clientes').delete().eq('id', id)
    fetchClientes()
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
    <div style={{minHeight:'100vh', background:'#F7F8FA'}}>

      {/* Header */}
      <header style={{background:'#fff', borderBottom:'1px solid #EAECF0', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10}}>
        <span style={{fontWeight:600, fontSize:'16px', color:'#111318', letterSpacing:'-0.3px'}}>Cuentas</span>
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <span style={{fontSize:'13px', color:'#9CA3AF'}}>{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()} style={{fontSize:'13px', color:'#6B7280', background:'none', border:'none', cursor:'pointer', padding:'4px 0'}}>
            Salir
          </button>
        </div>
      </header>

      <main style={{maxWidth:'600px', margin:'0 auto', padding:'20px 16px 40px'}}>

        {/* Card resumen */}
        <div style={{background:'#111318', borderRadius:'16px', padding:'24px', marginBottom:'16px', color:'#fff'}}>
          <p style={{fontSize:'12px', color:'#9CA3AF', marginBottom:'8px', fontWeight:500}}>Total a cobrar</p>
          <p style={{fontSize:'36px', fontWeight:600, color:'#E5484D', letterSpacing:'-1px', lineHeight:1}}>
            ${montoTotal.toLocaleString('es-AR')}
          </p>
          <p style={{fontSize:'13px', color:'#6B7280', marginTop:'8px'}}>
            {totalDeben} {totalDeben === 1 ? 'cliente debe' : 'clientes deben'} · {totalSaldados} saldados
          </p>
        </div>

        {/* Buscador */}
        <div style={{position:'relative', marginBottom:'12px'}}>
          <svg style={{position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF'}} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{width:'100%', paddingLeft:'40px', paddingRight:'16px', paddingTop:'11px', paddingBottom:'11px', border:'1px solid #EAECF0', borderRadius:'10px', fontSize:'14px', outline:'none', background:'#fff', color:'#111318', boxSizing:'border-box'}}
          />
        </div>

        {/* Tabs + botón nuevo */}
        <div style={{display:'flex', gap:'8px', marginBottom:'16px', alignItems:'center'}}>
          <div style={{display:'flex', background:'#EAECF0', borderRadius:'8px', padding:'3px', flex:1}}>
            {[['deben', `Deben (${totalDeben})`], ['saldados', `Saldados (${totalSaldados})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{flex:1, padding:'7px 0', fontSize:'13px', fontWeight:500, borderRadius:'6px', border:'none', cursor:'pointer', transition:'all 0.15s',
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#111318' : '#6B7280',
                  boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setModalNuevo(true)}
            style={{background:'#111318', color:'#fff', border:'none', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:500, cursor:'pointer', whiteSpace:'nowrap'}}>
            + Nuevo
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{color:'#9CA3AF', fontSize:'14px', textAlign:'center', padding:'40px 0'}}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div style={{textAlign:'center', padding:'48px 0'}}>
            <p style={{color:'#9CA3AF', fontSize:'14px'}}>
              {busqueda ? `Sin resultados para "${busqueda}"` : tab === 'deben' ? 'Ningún cliente debe.' : 'Ningún cliente saldado.'}
            </p>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {filtrados.map(c => (
              <div key={c.id} onClick={() => setClienteSeleccionado(c)}
                style={{background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', border:'1px solid #EAECF0', transition:'border-color 0.15s'}}
                onMouseEnter={e => e.currentTarget.style.borderColor='#D1D5DB'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#EAECF0'}
              >
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontWeight:500, fontSize:'15px', color:'#111318', marginBottom:'2px'}}>{c.nombre}</p>
                  {c.telefono && <p style={{fontSize:'13px', color:'#9CA3AF'}}>{c.telefono}</p>}
                  {c.saldo > 0 && c.diasDeuda !== null && (
                    <div style={{marginTop:'6px', display:'flex', alignItems:'center', gap:'6px'}}>
                      <AgingBadge dias={c.diasDeuda} />
                      <span style={{fontSize:'11px', color:'#9CA3AF'}}>sin saldar</span>
                    </div>
                  )}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontWeight:600, fontSize:'16px', letterSpacing:'-0.3px',
                      color: c.saldo > 0 ? '#E5484D' : c.saldo < 0 ? '#30A46C' : '#9CA3AF'}}>
                      ${Math.abs(c.saldo).toLocaleString('es-AR')}
                    </p>
                    <p style={{fontSize:'11px', color:'#9CA3AF', fontWeight:500}}>
                      {c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'a favor' : 'saldado'}
                    </p>
                  </div>
                  <button onClick={e => eliminarCliente(c.id, e)}
                    style={{color:'#D1D5DB', background:'none', border:'none', cursor:'pointer', fontSize:'20px', lineHeight:1, padding:'4px', borderRadius:'4px'}}
                    onMouseEnter={e => e.currentTarget.style.color='#E5484D'}
                    onMouseLeave={e => e.currentTarget.style.color='#D1D5DB'}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal nuevo cliente */}
      {modalNuevo && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', zIndex:50}}>
          <div style={{background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'360px'}}>
            <h3 style={{fontWeight:600, fontSize:'16px', color:'#111318', marginBottom:'16px'}}>Nuevo cliente</h3>
            <form onSubmit={crearCliente} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              <input type="text" placeholder="Nombre *" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required
                style={{border:'1px solid #EAECF0', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', outline:'none', color:'#111318'}}/>
              <input type="text" placeholder="Teléfono (opcional)" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)}
                style={{border:'1px solid #EAECF0', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', outline:'none', color:'#111318'}}/>
              <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                <button type="button" onClick={() => setModalNuevo(false)}
                  style={{flex:1, border:'1px solid #EAECF0', background:'#fff', color:'#6B7280', borderRadius:'8px', padding:'11px', fontSize:'14px', cursor:'pointer'}}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{flex:1, background:'#111318', color:'#fff', border:'none', borderRadius:'8px', padding:'11px', fontSize:'14px', fontWeight:500, cursor:'pointer'}}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}