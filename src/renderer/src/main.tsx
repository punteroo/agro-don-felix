import './assets/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </PrimeReactProvider>
  </StrictMode>
)
