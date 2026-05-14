import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Message } from 'primereact/message'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { MapPin, Layers, Wheat, Package, DollarSign, type LucideIcon } from 'lucide-react'
import { cosechasService, lotesService, preciosService } from '../services/ipc'
import type { CosechaRow, LoteRow, PrecioCacheRow } from '../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CULTIVO_COLORS: Record<string, string> = {
  Soja:    '#4caf50',
  Maíz:    '#ff9800',
  Trigo:   '#ffc107',
  Girasol: '#ffeb3b',
  Sorgo:   '#e91e63',
  Cebada:  '#8bc34a'
}

function colorForCultivo(nombre: string): string {
  return CULTIVO_COLORS[nombre] ?? '#78909c'
}

function formatTn(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' tn'
}

function formatARSCorto(n: number): string {
  if (n >= 1_000_000_000)
    return `$ ${(n / 1_000_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })}B ARS`
  if (n >= 1_000_000)
    return `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M ARS`
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`
}

function formatARSFull(n: number): string {
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`
}

// ── Animation variants ────────────────────────────────────────────────────────

const statsContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } }
}

const cardVariant = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } }
}

const sectionVariant = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } }
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  color: string
}

function StatCard({ icon: Icon, label, value, detail, color }: StatCardProps) {
  return (
    <motion.div
      className="stat-card"
      variants={cardVariant}
      style={{ borderLeftColor: color }}
      whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <Icon size={22} color={color} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
        {detail && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
            {detail}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

interface ProduccionPorCultivo {
  nombre: string
  produccion: number
}

export default function Dashboard() {
  const [cosechas, setCosechas] = useState<CosechaRow[]>([])
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [precios, setPrecios] = useState<PrecioCacheRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, l, p] = await Promise.all([
        cosechasService.getAll(),
        lotesService.getAll(),
        preciosService.getLatest()
      ])
      setCosechas(c)
      setLotes(l)
      setPrecios(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalSuperficie = lotes.reduce((s, l) => s + l.superficie_ha, 0)

  const totalProduccion = cosechas.reduce(
    (s, c) => s + (c.rendimiento * c.superficie_ha) / 1000,
    0
  )

  const produccionPorCultivo: ProduccionPorCultivo[] = Object.values(
    cosechas.reduce<Record<string, ProduccionPorCultivo>>((acc, c) => {
      const tn = (c.rendimiento * c.superficie_ha) / 1000
      if (!acc[c.cultivo_nombre]) acc[c.cultivo_nombre] = { nombre: c.cultivo_nombre, produccion: 0 }
      acc[c.cultivo_nombre].produccion += tn
      return acc
    }, {})
  ).sort((a, b) => b.produccion - a.produccion)

  const precioMap = new Map(precios.map((p) => [p.cultivo_id, p.precio_ton]))

  const valorEstimado = cosechas.reduce((s, c) => {
    const precio = precioMap.get(c.cultivo_id)
    return precio ? s + (c.rendimiento * c.superficie_ha) / 1000 * precio : s
  }, 0)

  const isEmpty = cosechas.length === 0 && lotes.length === 0

  if (loading)
    return (
      <div className="flex align-items-center justify-content-center" style={{ height: 300 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' as const }}
        >
          <Wheat size={28} color="var(--brand-light)" strokeWidth={1.5} />
        </motion.div>
      </div>
    )

  return (
    <div className="flex flex-column gap-4">
      {isEmpty && (
        <Message
          severity="info"
          icon="pi pi-info-circle"
          text="No hay datos registrados aún. Comience agregando lotes y cosechas."
          className="w-full"
        />
      )}

      {/* Stats row — staggered entrance */}
      <motion.div
        className="flex flex-wrap gap-3"
        variants={statsContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard icon={MapPin}      label="Lotes registrados"  value={lotes.length.toString()}                                                                          color="#2196f3" />
        <StatCard icon={Layers}      label="Superficie total"   value={`${totalSuperficie.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ha`}                    color="#4caf50" />
        <StatCard icon={Wheat}       label="Cosechas"           value={cosechas.length.toString()}                                                                        color="#ff9800" />
        <StatCard icon={Package}     label="Producción total"   value={formatTn(totalProduccion)}                                                                         color="#9c27b0" />
        {valorEstimado > 0 && (
          <StatCard
            icon={DollarSign}
            label="Valor estimado"
            value={formatARSCorto(valorEstimado)}
            detail={valorEstimado >= 1_000_000 ? formatARSFull(valorEstimado) : undefined}
            color="#e91e63"
          />
        )}
      </motion.div>

      {/* Charts row */}
      {cosechas.length > 0 && (
        <motion.div
          className="flex flex-wrap gap-3"
          variants={sectionVariant}
          initial="hidden"
          animate="visible"
        >
          {/* Bar chart */}
          <div
            className="card surface-0 border-round-lg shadow-1 flex flex-column gap-2"
            style={{ padding: '1.25rem', flex: '2 1 380px', minWidth: 0 }}
          >
            <span className="font-semibold" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>
              Producción por cultivo (tn)
            </span>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={produccionPorCultivo} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 12, fill: 'var(--text-color-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-color-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toLocaleString('es-AR')} tn`}
                  width={82}
                />
                <Tooltip
                  formatter={(v) => [formatTn(Number(v)), 'Producción']}
                  labelStyle={{ fontWeight: 600, color: 'var(--text-color)' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--surface-border)',
                    background: 'var(--surface-overlay)',
                    color: 'var(--text-color)'
                  }}
                  cursor={{ fill: 'var(--surface-hover)' }}
                />
                <Bar dataKey="produccion" radius={[4, 4, 0, 0]}>
                  {produccionPorCultivo.map((entry) => (
                    <Cell key={entry.nombre} fill={colorForCultivo(entry.nombre)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Latest prices */}
          {precios.length > 0 && (
            <div
              className="card surface-0 border-round-lg shadow-1 flex flex-column gap-2"
              style={{ padding: '1.25rem', flex: '1 1 220px', minWidth: 0 }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>
                Últimos precios registrados
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    {(['Cultivo', 'ARS / tn', 'Fecha'] as const).map((h) => (
                      <th
                        key={h}
                        className={h !== 'Cultivo' ? 'text-right' : 'text-left'}
                        style={{
                          borderBottom: '1px solid var(--surface-border)',
                          paddingBottom: '0.5rem',
                          color: 'var(--text-color-secondary)',
                          fontWeight: 500
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {precios.map((p) => {
                    const [y, m, d] = p.fecha_precio.split('-').map(Number)
                    const label = new Date(y, m - 1, d).toLocaleDateString('es-AR')
                    return (
                      <tr key={p.id}>
                        <td style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: colorForCultivo(p.cultivo_nombre),
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4
                            }}
                          >
                            {p.cultivo_nombre}
                          </span>
                        </td>
                        <td
                          className="text-right font-semibold"
                          style={{
                            color: 'var(--text-color)',
                            padding: '0.45rem 0',
                            borderBottom: '1px solid var(--surface-border)'
                          }}
                        >
                          {p.precio_ton.toLocaleString('es-AR')}
                        </td>
                        <td
                          className="text-right"
                          style={{
                            color: 'var(--text-color-secondary)',
                            fontSize: '0.8rem',
                            padding: '0.45rem 0',
                            borderBottom: '1px solid var(--surface-border)'
                          }}
                        >
                          {label}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
