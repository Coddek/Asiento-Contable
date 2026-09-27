import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errores'
import Spinner from './Spinner'
import MarcaT from './MarcaT'

const campo =
  'w-full bg-hoja border border-renglon rounded-2xl px-4 py-3.5 text-[16px] outline-none placeholder:text-tinta-tenue focus:border-tinta focus-visible:outline-none focus:ring-1 focus:ring-tinta'

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
      if (error) setError(mensajeError(error, 'No se pudo ingresar. Probá de nuevo.'))
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(mensajeError(error, 'No se pudo crear la cuenta. Probá de nuevo.'))
      } else if (!data.session) {
        setInfo('Cuenta creada. Te mandamos un email: confirmalo y después ingresá.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <MarcaT className="h-12 w-12 mb-6" />
        <h1 className="font-titulo text-[34px] font-semibold leading-tight tracking-tight mb-2">Asiento Contable</h1>
        <p className="text-[16px] text-tinta-suave mb-8">
          {modo === 'ingresar'
            ? 'Las cuentas corrientes de tus clientes: quién te debe y cuánto.'
            : 'Creá tu cuenta con un email y una contraseña.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={campo} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
            Contraseña
            <input
              type="password"
              autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={campo}
            />
          </label>

          {error && <p role="alert" className="text-sm text-debe bg-debe-claro rounded-xl px-3.5 py-2.5">{error}</p>}
          {info && <p className="text-sm text-haber bg-haber-claro rounded-xl px-3.5 py-2.5">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium hover:brightness-125 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? 'Un momento...' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'ingresar' ? 'crear' : 'ingresar')
            setError('')
            setInfo('')
          }}
          className="mt-6 w-full text-center text-[15px] text-tinta-suave underline underline-offset-4 decoration-renglon hover:text-tinta"
        >
          {modo === 'ingresar' ? 'No tengo cuenta, quiero crear una' : 'Ya tengo cuenta, quiero ingresar'}
        </button>
      </div>
    </div>
  )
}
