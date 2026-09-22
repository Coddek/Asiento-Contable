import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Spinner from './Spinner'

export default function Login() {
  const [modo, setModo] = useState('ingresar') // 'ingresar' | 'crear'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (modo === 'ingresar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contraseña incorrectos')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        // Ya quedó logueado (confirmación de email desactivada en el proyecto)
      } else {
        setInfo('Cuenta creada. Revisá tu email para confirmarla antes de entrar.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm">
        <div className="h-11 w-11 rounded-full bg-stone-900 flex items-center justify-center text-white font-semibold mb-6">
          $
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-1">Cuentas</h1>
        <p className="text-stone-400 text-sm mb-7">
          {modo === 'ingresar' ? 'Ingresá para ver tus clientes' : 'Creá tu cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-stone-200 rounded-full px-4 py-3 text-sm outline-none bg-white transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="border border-stone-200 rounded-full px-4 py-3 text-sm outline-none bg-white transition-shadow focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
          />

          {error && <p className="text-rose-600 text-sm px-1">{error}</p>}
          {info && <p className="text-emerald-600 text-sm px-1">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-stone-900 text-white rounded-full py-3 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-1"
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? 'Un momento...' : modo === 'ingresar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'ingresar' ? 'crear' : 'ingresar')
            setError('')
            setInfo('')
          }}
          className="text-sm text-stone-400 hover:text-stone-600 mt-5 w-full text-center transition-colors"
        >
          {modo === 'ingresar' ? '¿No tenés cuenta? Creá una' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  )
}
