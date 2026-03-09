import { Menubar } from 'primereact/menubar'
import type { MenuItem } from 'primereact/menuitem'

const menuItems: MenuItem[] = [
  {
    label: 'Panel',
    icon: 'pi pi-home',
    url: '#/'
  },
  {
    label: 'Cosechas',
    icon: 'pi pi-table',
    url: '#/cosechas'
  },
  {
    label: 'Lotes',
    icon: 'pi pi-map',
    url: '#/lotes'
  },
  {
    label: 'Precios',
    icon: 'pi pi-chart-line',
    url: '#/precios'
  },
  {
    label: 'Reportes',
    icon: 'pi pi-file-excel',
    url: '#/reportes'
  }
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {

  const start = (
    <div className="flex align-items-center gap-2" style={{ padding: '0 0.5rem' }}>
      <i className="pi pi-leaf" style={{ fontSize: '1.4rem', color: '#2e7d32' }} />
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1b5e20' }}>
        Agro Don Félix
      </span>
    </div>
  )

  return (
    <div className="flex flex-column" style={{ height: '100vh' }}>
      {/* Top navigation bar */}
      <Menubar model={menuItems} start={start} style={{ borderRadius: 0, flexShrink: 0 }} />

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: '1.5rem', background: '#f0f4f0' }}
      >
        {children}
      </main>
    </div>
  )
}
