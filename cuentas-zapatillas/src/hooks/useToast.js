import { useState, useCallback, useRef } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((message, tipo = 'ok') => {
    clearTimeout(timer.current)
    setToast({ message, tipo })
    timer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  return [toast, showToast]
}
