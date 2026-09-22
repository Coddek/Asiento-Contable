import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Cuentas</h1>
        <p className="text-gray-400 text-sm mb-6">
          {modo === 'ingresar' ? 'Ingresá para ver tus clientes' : 'Creá tu cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {info && <p className="text-green-600 text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Un momento...' : modo === 'ingresar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'ingresar' ? 'crear' : 'ingresar')
            setError('')
            setInfo('')
          }}
          className="text-sm text-gray-400 hover:text-gray-600 mt-4 w-full text-center"
        >
          {modo === 'ingresar' ? '¿No tenés cuenta? Creá una' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  )
}
