import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Leaf,
  LayoutDashboard,
  Wheat,
  Map,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const SIDEBAR_EXPANDED = 220
const SIDEBAR_COLLAPSED = 60

const NAV_ITEMS = [
  { path: '/',               icon: LayoutDashboard, label: 'Panel',          end: true  },
  { path: '/cosechas',       icon: Wheat,           label: 'Cosechas',       end: false },
  { path: '/lotes',          icon: Map,             label: 'Lotes',          end: false },
  { path: '/precios',        icon: TrendingUp,      label: 'Precios',        end: false },
  { path: '/reportes',       icon: FileSpreadsheet, label: 'Reportes',       end: false },
  { path: '/configuracion',  icon: Settings,        label: 'Configuración',  end: false }
]

const PAGE_TITLES: Record<string, string> = {
  '/':               'Panel Principal',
  '/cosechas':       'Gestión de Cosechas',
  '/lotes':          'Gestión de Lotes',
  '/precios':        'Precios de Mercado',
  '/reportes':       'Reportes y Exportación',
  '/configuracion':  'Configuración'
}

// ── Sidebar animations ────────────────────────────────────────────────────────

const ease = {
  out: 'easeOut' as const,
  in:  'easeIn'  as const
}

const labelVariants = {
  visible: { opacity: 1, x: 0,  transition: { duration: 0.14, ease: ease.out } },
  hidden:  { opacity: 0, x: -8, transition: { duration: 0.1,  ease: ease.in  } }
}

const logoTextVariants = {
  visible: { opacity: 1, x: 0,  transition: { duration: 0.15, delay: 0.04, ease: ease.out } },
  hidden:  { opacity: 0, x: -6, transition: { duration: 0.1,  ease: ease.in } }
}

const toggleIconVariants = {
  initial: { rotate: -90, opacity: 0, scale: 0.7 },
  animate: { rotate: 0,   opacity: 1, scale: 1,   transition: { duration: 0.18 } },
  exit:    { rotate: 90,  opacity: 0, scale: 0.7, transition: { duration: 0.14 } }
}

const themeIconVariants = {
  initial: { rotate: -30, opacity: 0, scale: 0.8 },
  animate: { rotate: 0,   opacity: 1, scale: 1,   transition: { duration: 0.2 } },
  exit:    { rotate: 30,  opacity: 0, scale: 0.8, transition: { duration: 0.15 } }
}

const pageVariants = {
  initial: { opacity: 0, y: 8  },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2,  ease: ease.out } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14, ease: ease.in  } }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const { theme, toggle: toggleTheme } = useTheme()
  const location = useLocation()

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Agro Don Félix'

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <motion.aside
        className="app-sidebar"
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Leaf size={18} color="#4caf50" strokeWidth={2.2} />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                variants={logoTextVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
              >
                <div className="sidebar-logo-text">Agro Don Félix</div>
                <div className="sidebar-logo-sub">Control Agrario</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, icon: Icon, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `nav-item${isActive ? ' nav-item--active' : ''}`
              }
              title={collapsed ? label : undefined}
              style={{
                justifyContent: collapsed ? 'center' : undefined,
                paddingLeft:    collapsed ? 0 : undefined,
                paddingRight:   collapsed ? 0 : undefined
              }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="nav-active-indicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{ flexShrink: 0 }}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        variants={labelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={collapsed ? 'open' : 'close'}
                variants={toggleIconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {collapsed
                  ? <PanelLeftOpen  size={16} strokeWidth={1.8} />
                  : <PanelLeftClose size={16} strokeWidth={1.8} />
                }
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <h1 className="app-topbar-title">{pageTitle}</h1>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                variants={themeIconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {theme === 'dark'
                  ? <Sun  size={16} strokeWidth={2} />
                  : <Moon size={16} strokeWidth={2} />
                }
              </motion.div>
            </AnimatePresence>
          </button>
        </header>

        {/* Page content with enter/exit transitions */}
        <div className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
