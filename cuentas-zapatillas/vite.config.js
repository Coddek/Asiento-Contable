import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Los mismos encabezados de seguridad que manda Vercel (vercel.json), para
// probarlos localmente con `npm run build && npm run preview` antes de publicar.
const encabezados = Object.fromEntries(
  JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8'))
    .headers[0].headers.map(({ key, value }) => [key, value])
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: encabezados },
})
