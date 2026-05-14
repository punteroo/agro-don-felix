import { useState, useEffect, useCallback } from 'react'
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
import { cosechasService, lotesService, preciosService } from '../services/ipc'
import type { CosechaRow, LoteRow, PrecioCacheRow } from '../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CULTIVO_COLORS: Record<string, string> = {
  Soja: '#4caf50',
  Maíz: '#ff9800',
  Trigo: '#ffc107',
  Girasol: '#ffeb3b',
  Sorgo: '#e91e63',
  Cebada: '#8bc34a'
}

function colorForCultivo(nombre: string): string {
  return CULTIVO_COLORS[nombre] ?? '#78909c'
}

function formatTn(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' tn'
}

function formatARS(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string
  label: string
  value: string
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div
      className="card surface-0 border-round-lg shadow-1 flex align-items-center gap-3"
      style={{ padding: '1.2rem 1.5rem', flex: 1, minWidth: '180px' }}
    >
      <div
        className="border-round-lg flex align-items-center justify-content-center"
        style={{ width: 48, height: 48, background: color + '22', flexShrink: 0 }}
      >
        <i className={`pi ${icon}`} style={{ fontSize: '1.4rem', color }} />
      </div>
      <div>
        <div className="text-500 text-sm">{label}</div>
        <div className="font-bold text-xl text-800">{value}</div>
      </div>
    </div>
  )
}

// ── Dashboard component ───────────────────────────────────────────────────────

interface ProduccionPorCultivo {
  nombre: string
  produccion: number
  cosechas: number
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

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalSuperficie = lotes.reduce((s, l) => s + l.superficie_ha, 0)

  const totalProduccion = cosechas.reduce(
    (s, c) => s + (c.rendimiento * c.superficie_ha) / 1000,
    0
  )

  // Production grouped by cultivo
  const produccionPorCultivo: ProduccionPorCultivo[] = Object.values(
    cosechas.reduce<Record<string, ProduccionPorCultivo>>((acc, c) => {
      const tn = (c.rendimiento * c.superficie_ha) / 1000
      if (!acc[c.cultivo_nombre]) {
        acc[c.cultivo_nombre] = { nombre: c.cultivo_nombre, produccion: 0, cosechas: 0 }
      }
      acc[c.cultivo_nombre].produccion += tn
      acc[c.cultivo_nombre].cosechas += 1
      return acc
    }, {})
  ).sort((a, b) => b.produccion - a.produccion)

  // Estimated total value: sum over cosechas of (production_tn * latest_price_for_cultivo)
  const precioMap = new Map(precios.map((p) => [p.cultivo_id, p.precio_ton]))
  const valorEstimado = cosechas.reduce((s, c) => {
    const precio = precioMap.get(c.cultivo_id)
    if (!precio) return s
    return s + (c.rendimiento * c.superficie_ha) / 1000 * precio
  }, 0)

  const isEmpty = cosechas.length === 0 && lotes.length === 0

  if (loading)
    return (
      <div className="flex align-items-center justify-content-center" style={{ height: 300 }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#4caf50' }} />
      </div>
    )

  return (
    <div className="flex flex-column gap-4">
      <span className="text-xl font-bold text-800">Panel Principal</span>

      {/* Empty state */}
      {isEmpty && (
        <Message
          severity="info"
          icon="pi pi-info-circle"
          text="No hay datos registrados aún. Comience agregando lotes y cosechas."
          className="w-full"
        />
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <StatCard
          icon="pi-map"
          label="Lotes registrados"
          value={lotes.length.toString()}
          color="#2196f3"
        />
        <StatCard
          icon="pi-th-large"
          label="Superficie total"
          value={`${totalSuperficie.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ha`}
          color="#4caf50"
        />
        <StatCard
          icon="pi-table"
          label="Cosechas registradas"
          value={cosechas.length.toString()}
          color="#ff9800"
        />
        <StatCard
          icon="pi-box"
          label="Producción total"
          value={formatTn(totalProduccion)}
          color="#9c27b0"
        />
        {valorEstimado > 0 && (
          <StatCard
            icon="pi-dollar"
            label="Valor estimado (ARS)"
            value={formatARS(valorEstimado)}
            color="#e91e63"
          />
        )}
      </div>

      {/* Charts + prices row */}
      {cosechas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {/* Bar chart — production by cultivo */}
          <div
            className="card surface-0 border-round-lg shadow-1 flex flex-column gap-2"
            style={{ padding: '1.2rem', flex: '2 1 380px', minWidth: 0 }}
          >
            <span className="font-semibold text-700">Producción por cultivo (tn)</span>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={produccionPorCultivo}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 13 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toLocaleString('es-AR')} tn`}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => [formatTn(Number(value)), 'Producción']}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
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
              style={{ padding: '1.2rem', flex: '1 1 240px', minWidth: 0 }}
            >
              <span className="font-semibold text-700">Últimos precios registrados</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                <thead>
                  <tr>
                    <th
                      className="text-left text-500 font-normal pb-2"
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      Cultivo
                    </th>
                    <th
                      className="text-right text-500 font-normal pb-2"
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      ARS / tn
                    </th>
                    <th
                      className="text-right text-500 font-normal pb-2"
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {precios.map((p) => {
                    const [y, m, d] = p.fecha_precio.split('-').map(Number)
                    const label = new Date(y, m - 1, d).toLocaleDateString('es-AR')
                    return (
                      <tr key={p.id}>
                        <td
                          className="py-2"
                          style={{ borderBottom: '1px solid #f5f5f5' }}
                        >
                          <span
                            className="inline-block border-round px-2 py-1 text-white text-xs font-semibold"
                            style={{ background: colorForCultivo(p.cultivo_nombre) }}
                          >
                            {p.cultivo_nombre}
                          </span>
                        </td>
                        <td
                          className="text-right font-semibold text-800 py-2"
                          style={{ borderBottom: '1px solid #f5f5f5' }}
                        >
                          {p.precio_ton.toLocaleString('es-AR')}
                        </td>
                        <td
                          className="text-right text-500 text-sm py-2"
                          style={{ borderBottom: '1px solid #f5f5f5' }}
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
        </div>
      )}
    </div>
  )
}
