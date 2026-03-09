import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Cosechas from './pages/Cosechas'
import Lotes from './pages/Lotes'
import Precios from './pages/Precios'
import Reportes from './pages/Reportes'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cosechas" element={<Cosechas />} />
        <Route path="/lotes" element={<Lotes />} />
        <Route path="/precios" element={<Precios />} />
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
    </AppLayout>
  )
}
