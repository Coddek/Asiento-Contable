import { useState } from 'react'

// Contraseña con botón para mostrarla: evita errores de tipeo en el celu sin
// tener que escribirla dos veces.
export default function CampoContrasena({ etiqueta, value, onChange, autoComplete, minLength, autoFocus }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="flex flex-col gap-1.5 text-sm text-tinta-suave">
      {etiqueta}
      <span className="relative">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-hoja border border-renglon rounded-2xl pl-4 pr-24 py-3.5 text-[16px] text-tinta outline-none focus:border-tinta focus-visible:outline-none focus:ring-1 focus:ring-tinta"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-[14px] text-tinta-suave hover:text-tinta"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </span>
    </label>
  )
}
