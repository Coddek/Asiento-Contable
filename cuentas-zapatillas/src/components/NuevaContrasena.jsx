import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errores'
import Spinner from './Spinner'
import MarcaT from './MarcaT'
import CampoContrasena from './CampoContrasena'

// Pantalla a la que llega el link de "Olvidé mi contraseña": el link ya inició
// una sesión temporal, acá se elige la contraseña nueva.
export default function NuevaContrasena({ onListo }) {
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Usá al menos 8 caracteres.')
      return
    }
    setGuardando(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)
    if (error) {
      setError(mensajeError(error, 'No se pudo guardar la contraseña. Probá de nuevo.'))
      return
    }
    onListo()
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <MarcaT className="h-12 w-12 mb-6" />
        <h1 className="font-titulo text-[34px] font-semibold leading-tight tracking-tight mb-2">Contraseña nueva</h1>
        <p className="text-[16px] text-tinta-suave mb-8">Elegí una contraseña de al menos 8 caracteres. Con esta vas a ingresar de ahora en más.</p>

        <form onSubmit={guardar} className="flex flex-col gap-3">
          <CampoContrasena etiqueta="Contraseña nueva" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} autoFocus />

          {error && <p role="alert" className="text-sm text-debe bg-debe-claro rounded-xl px-3.5 py-2.5">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="mt-2 bg-tinta text-white rounded-2xl py-4 text-[16px] font-medium hover:brightness-125 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {guardando && <Spinner className="w-4 h-4" />}
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
