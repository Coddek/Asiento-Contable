import { mensajeError } from './errores'

// Los links de los emails (confirmar cuenta, recuperar contraseña) vuelven a la
// app con datos en la URL. Supabase los procesa y los borra al iniciar, así que
// se leen acá, antes de crear el cliente (main.jsx importa este archivo primero).
function leer() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const codigo = hash.get('error_code') || query.get('error_code')
  const descripcion = hash.get('error_description') || query.get('error_description')

  if (codigo || descripcion) {
    // Un link con error no trae sesión: se limpia la URL para que no quede ahí.
    window.history.replaceState(null, '', window.location.pathname)
    return {
      tipo: 'error',
      texto: mensajeError({ code: codigo, message: descripcion }, 'El link no es válido. Pedí uno nuevo.'),
    }
  }
  const tipo = hash.get('type') || query.get('type')
  if (tipo === 'recovery') return { tipo: 'recuperar' }
  if (tipo === 'signup' || tipo === 'email') return { tipo: 'ok', texto: 'Email confirmado. Ya podés usar tu cuenta.' }
  return null
}

export const avisoInicial = leer()
