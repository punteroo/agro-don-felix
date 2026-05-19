import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Type, Eye } from 'lucide-react'
import { useSettings, type FontSize, type ColorMode } from '../context/SettingsContext'

// ── Animations ─────────────────────────────────────────────────────────────────

const containerVariant = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } }
}

const cardVariant = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
}

// ── Section card ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon:        ReactNode
  title:       string
  description: string
  children:    ReactNode
}

function SectionCard({ icon, title, description, children }: SectionCardProps) {
  return (
    <div className="config-section-card">
      <div className="config-section-header">
        <div className="config-section-icon">{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="config-section-title">{title}</h2>
          <p  className="config-section-desc">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────

const FONT_OPTIONS: { value: FontSize; label: string; sizePx: number }[] = [
  { value: 'small',  label: 'Pequeño',    sizePx: 13 },
  { value: 'normal', label: 'Normal',     sizePx: 15 },
  { value: 'large',  label: 'Grande',     sizePx: 18 },
  { value: 'xlarge', label: 'Muy grande', sizePx: 21 }
]

const COLOR_OPTIONS: { value: ColorMode; label: string; desc: string }[] = [
  { value: 'normal',        label: 'Normal',         desc: 'Sin corrección de color aplicada.' },
  { value: 'deuteranopia',  label: 'Deuteranopia',   desc: 'Deficiencia verde-rojo (la más frecuente, ~6% en hombres).' },
  { value: 'protanopia',    label: 'Protanopia',     desc: 'Deficiencia de percepción del rojo.' },
  { value: 'tritanopia',    label: 'Tritanopia',     desc: 'Deficiencia de percepción del azul-amarillo.' },
  { value: 'high-contrast', label: 'Alto contraste', desc: 'Mayor contraste y saturación para mejor legibilidad.' }
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function Configuracion() {
  const { fontSize, colorMode, setFontSize, setColorMode } = useSettings()

  return (
    <motion.div
      className="flex flex-column gap-4"
      style={{ maxWidth: 780 }}
      variants={containerVariant}
      initial="hidden"
      animate="visible"
    >
      {/* ── Font size ─────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariant}>
        <SectionCard
          icon={<Type size={18} strokeWidth={1.8} />}
          title="Tamaño de texto"
          description="Ajusta el tamaño base de la interfaz. El cambio se aplica de inmediato en toda la aplicación, incluyendo tablas, formularios y gráficos."
        >
          <div className="config-font-options mt-3">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`config-font-btn${fontSize === opt.value ? ' config-font-btn--active' : ''}`}
                onClick={() => setFontSize(opt.value)}
                title={`Establecer tamaño ${opt.label}`}
              >
                <span className="config-font-sample" style={{ fontSize: opt.sizePx }}>A</span>
                <span className="config-font-label">{opt.label}</span>
                {fontSize === opt.value && (
                  <CheckCircle2 size={13} className="config-check-icon" strokeWidth={2.2} />
                )}
              </button>
            ))}
          </div>

          <div className="config-preview-box mt-3">
            <span className="config-preview-label">Vista previa</span>
            <p style={{ margin: 0, lineHeight: 1.65 }}>
              El sistema registra la producción de los lotes y calcula el rendimiento por
              hectárea a partir de las toneladas cosechadas.{' '}
              <span style={{ color: 'var(--text-color-secondary)' }}>
                Temporada 2024/2025 - Soja, Maíz, Trigo.
              </span>
            </p>
          </div>
        </SectionCard>
      </motion.div>

      {/* ── Color correction ──────────────────────────────────────────────── */}
      <motion.div variants={cardVariant}>
        <SectionCard
          icon={<Eye size={18} strokeWidth={1.8} />}
          title="Corrección de color"
          description="Aplica un filtro de corrección visual para distintos tipos de daltonismo o para aumentar el contraste. Al seleccionar una opción el efecto se aplica instantáneamente sobre toda la interfaz."
        >
          <div className="config-color-grid mt-3">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`config-color-tile${colorMode === opt.value ? ' config-color-tile--active' : ''}`}
                onClick={() => setColorMode(opt.value)}
                title={opt.label}
              >
                <div className="config-color-tile-top">
                  <span className="config-color-tile-label">{opt.label}</span>
                  {colorMode === opt.value && (
                    <CheckCircle2 size={13} className="config-check-icon" strokeWidth={2.2} />
                  )}
                </div>
                <span className="config-color-tile-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
