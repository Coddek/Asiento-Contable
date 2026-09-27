import { toBlob } from 'html-to-image'

// Convierte un nodo en PNG. Dos pasadas: Safari a veces no incluye fuentes o
// imágenes en la primera (workaround conocido de html-to-image). Se llama recién
// al tocar "Compartir", nunca al cargar la pantalla: en el celu es trabajo pesado.
export async function generarImagen(nodo, nombre) {
  await document.fonts.ready
  const opciones = { pixelRatio: 3, cacheBust: true }
  await toBlob(nodo, opciones)
  const blob = await toBlob(nodo, opciones)
  if (!blob) throw new Error('No se pudo generar la imagen')
  return new File([blob], nombre, { type: 'image/png' })
}

// Abre el menú de compartir del celu (WhatsApp, etc.) con la imagen; donde no
// se puede compartir archivos (compu), la descarga.
// Devuelve 'ok' | 'descargada' | 'reintentar' | 'error'. 'reintentar' = armar la
// imagen tardó y el celu (sobre todo iPhone) ya no acepta abrir el menú por ese
// toque: con la imagen lista, un segundo toque la manda al instante.
export async function compartirArchivo(archivo) {
  if (!navigator.canShare?.({ files: [archivo] })) {
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.name
    a.click()
    URL.revokeObjectURL(url)
    return 'descargada'
  }
  try {
    await navigator.share({ files: [archivo] })
    return 'ok'
  } catch (e) {
    if (e?.name === 'AbortError') return 'ok'
    if (e?.name === 'NotAllowedError') return 'reintentar'
    return 'error'
  }
}
