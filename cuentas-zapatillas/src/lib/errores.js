// Traduce errores técnicos (de Supabase, de la red, del login) a un mensaje
// que cualquiera pueda entender y que diga qué hacer. Nunca se muestra el
// error crudo en pantalla.
export function mensajeError(error, respaldo = 'Algo salió mal. Probá de nuevo en un momento.') {
  if (!error) return respaldo
  const codigo = String(error.code ?? '').toLowerCase()
  const msg = String(error.message ?? error).toLowerCase()
  const estado = Number(error.status ?? 0)

  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
    return 'No hay conexión. Revisá internet y probá de nuevo.'
  }

  // Login y registro
  if (msg.includes('invalid login credentials')) return 'El email o la contraseña no coinciden.'
  if (msg.includes('email not confirmed')) return 'Falta confirmar tu email. Revisá tu casilla (y el correo no deseado).'
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Ya hay una cuenta con ese email. Ingresá con tu contraseña.'
  }
  if (codigo === 'same_password' || msg.includes('different from the old')) {
    return 'La contraseña nueva tiene que ser distinta de la actual.'
  }
  if (codigo === 'weak_password' || (msg.includes('password') && (msg.includes('at least') || msg.includes('characters') || msg.includes('weak')))) {
    return 'La contraseña tiene que tener al menos 8 caracteres, con letras y números.'
  }
  if (msg.includes('pwned') || msg.includes('leaked') || msg.includes('compromised')) {
    return 'Esa contraseña apareció en filtraciones de otros sitios. Elegí otra.'
  }
  if (codigo === 'reauthentication_needed' || msg.includes('reauthentication')) {
    return 'Por seguridad, salí y volvé a ingresar antes de cambiar la contraseña.'
  }
  if (codigo === 'otp_expired' || (msg.includes('link') && (msg.includes('expired') || msg.includes('invalid'))) || (msg.includes('otp') && msg.includes('expired'))) {
    return 'El link venció o ya se usó. Pedí uno nuevo.'
  }
  if (msg.includes('invalid') && msg.includes('email')) return 'Revisá el email: no parece válido.'
  if (msg.includes('rate limit') || estado === 429) return 'Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.'
  if (msg.includes('signup') && msg.includes('disabled')) return 'Por ahora no se pueden crear cuentas nuevas.'

  // Sesión y permisos
  if (msg.includes('jwt') || msg.includes('session') || estado === 401) return 'Tu sesión venció. Salí y volvé a ingresar.'
  if (codigo === '42501' || msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'No tenés permiso para hacer eso.'
  }

  // Datos
  if (codigo === '23505') return 'Eso ya está cargado.'
  if (codigo === '23502') return 'Falta completar un dato obligatorio.'
  if (codigo === '23514' || codigo === '22p02' || codigo === '22003') return 'Revisá los datos: hay un valor que no es válido.'

  return respaldo
}
