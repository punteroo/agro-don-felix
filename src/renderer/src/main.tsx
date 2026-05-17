import './assets/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <PrimeReactProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </PrimeReactProvider>
      </ThemeProvider>
    </SettingsProvider>
  </StrictMode>
)
