import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Primero: lee los datos de los links de email antes de que Supabase los borre.
import './lib/avisoUrl'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
