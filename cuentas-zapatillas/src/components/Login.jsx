import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errores'
import Spinner from './Spinner'
import MarcaT from './MarcaT'
import CampoContrasena from './CampoContrasena'

const campo =
  'w-full bg-hoja border border-renglon rounded-2xl px-4 py-3.5 text-[16px] outline-none placeholder:text-tinta-tenue focus:border-tinta focus-visible:outline-none focus:ring-1 focus:ring-tinta'

// Los links de los emails vuelven a esta misma dirección (tiene que estar en la
// lista de "Redirect URLs" de Supabase).
const volverA = () => window.location.origin

const TEXTOS = {
  ingresar: { bajada: 'Las cuentas corrientes de tus clientes: quién te debe y cuánto.', boton: 'Ingresar' },
  crear: { bajada: 'Creá tu cuenta con tu email y una contraseña de al menos 8 caracteres, con letras y números.', boton: 'Crear cuenta' },
  olvide: { bajada: 'Escribí tu email y te mandamos un link para elegir una contraseña nueva.', boton: 'Mandarme el link' },
}

export default function Login({ aviso }) {
  const [modo, setModo] = useState('ingresar') // 'ingresar' | 'crear' | 'olvide'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(aviso?.tipo === 'error' ? aviso.texto : '')
  const [info, setInfo] = useState(aviso?.tipo === 'ok' ? aviso.texto : '')
  const [sinConfirmar, setSinConfirmar] = useState(false)

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setError('')
    setInfo('')
    setSinConfirmar(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    setSinConfirmar(false)
    const mail = email.trim()

    if (modo === 'ingresar') {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) {
        setError(mensajeError(error, 'No se pudo ingresar. Probá de nuevo.'))
        setSinConfirmar(String(error.message).toLowerCase().includes('not confirmed'))
      }
    } else if (modo === 'crear') {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: volverA() },
      })
      if (error) {
        setError(mensajeError(error, 'No se pudo crear la cuenta. Probá de nuevo.'))
      } else if (!data.session) {
        setInfo(`Te mandamos un email a ${mail}. Abrí el link para confirmar la cuenta y después ingresá. Si no llega, revisá el correo no deseado.`)
        setPassword('')
        setModo('ingresar')
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: volverA() })
      if (error) {
        setError(mensajeError(error, 'No se pudo mandar el link. Probá de nuevo.'))
      } else {
        // Mismo mensaje exista o no la cuenta: no se revela qué emails están registrados.
        setInfo(`Si hay una cuenta con ${mail}, te llegó un link para elegir una contraseña nueva. Revisá también el correo no deseado.`)
      }
    }

    setLoading(false)
  }

  async function reenviarConfirmacion() {
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: volverA() } })
    setLoading(false)
    if (error) {
      setError(mensajeError(error, 'No se pudo reenviar el email. Probá de nuevo.'))
      return
    }
    setSinConfirmar(false)
    setError('')
    setInfo('Te reenviamos el email de confirmación. Revisá también el correo no deseado.')
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <MarcaT className="h-12 w-12 mb-6" />
        <h1 className="font-titulo text-[34px] font-semibold leading-tight tracking-tight mb-2">
          {modo === 'olvide' ? 'Recuperar contraseña' : 'Asiento Contable'}
        </h1>
        <p className="text-[16px] text-tinta-suave mb-8">{TEXTOS[modo].bajada}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
            Email
            <input
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={campo}
            />
          </label>

          {modo !== 'olvide' && (
            <CampoContrasena
              etiqueta="Contraseña"
              value={password}
              onChange={setPassword}
              autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'}
              minLength={modo === 'crear' ? 8 : undefined}
            />
          )}

          {modo === 'ingresar' && (
            <button type="button" onClick={() => cambiarModo('olvide')} className="self-end text-[14px] text-tinta-suave underline underline-offset-4 decoration-renglon hover:text-tinta -mt-1 py-1">
              Olvidé mi contraseña
            </button>
          )}

          {error && (
            <div role="alert" className="text-sm text-debe bg-debe-claro rounded-xl px-3.5 py-2.5">
              {error}
              {sinConfirmar && (
                <button type="button" onClick={reenviarConfirmacion} disabled={loading} className="block mt-1.5 font-medium underline underline-offset-4">
                  Reenviar el email de confirmación
                </button>
              )}
            </div>
          )}
          {info && <p role="status" className="text-sm text-haber bg-haber-claro rounded-xl px-3.5 py-2.5">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium hover:brightness-125 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? 'Un momento...' : TEXTOS[modo].boton}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          {modo === 'ingresar' ? (
            <button onClick={() => cambiarModo('crear')} className="text-[15px] text-tinta-suave underline underline-offset-4 decoration-renglon hover:text-tinta py-1">
              No tengo cuenta, quiero crear una
            </button>
          ) : (
            <button onClick={() => cambiarModo('ingresar')} className="text-[15px] text-tinta-suave underline underline-offset-4 decoration-renglon hover:text-tinta py-1">
              {modo === 'crear' ? 'Ya tengo cuenta, quiero ingresar' : 'Volver a ingresar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
