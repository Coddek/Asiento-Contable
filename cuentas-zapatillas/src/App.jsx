import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { avisoInicial } from './lib/avisoUrl'
import Login from './components/Login'
import NuevaContrasena from './components/NuevaContrasena'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Entró desde el link de "olvidé mi contraseña": primero elige una nueva.
  const [recuperando, setRecuperando] = useState(avisoInicial?.tipo === 'recuperar')
  const [aviso, setAviso] = useState(avisoInicial?.tipo === 'recuperar' ? null : avisoInicial)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesionActual) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (evento === 'SIGNED_OUT') setRecuperando(false)
      setSession(sesionActual)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="min-h-dvh" />

  if (session && recuperando) {
    return (
      <NuevaContrasena
        onListo={() => {
          setRecuperando(false)
          setAviso({ tipo: 'ok', texto: 'Contraseña actualizada.' })
        }}
      />
    )
  }

  return session
    ? <Dashboard session={session} aviso={aviso} onAvisoVisto={() => setAviso(null)} />
    : <Login aviso={aviso} />
}

export default App
