import { useState, useEffect, useCallback, useMemo } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ChevronDown, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cosechasService, cultivosService, lotesService, preciosService } from '../services/ipc'
import type { CosechaRow, Cultivo, LoteRow, PrecioCacheRow } from '../types/domain'

// ── Colors & formatters ───────────────────────────────────────────────────────

const CULTIVO_COLORS: Record<string, string> = {
  Soja:    '#4caf50',
  'Maíz':  '#ff9800',
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

function formatARS(n: number): string {
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`
}

function formatARSCorto(n: number): string {
  if (n >= 1_000_000_000)
    return `$ ${(n / 1_000_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })}B ARS`
  if (n >= 1_000_000)
    return `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M ARS`
  return formatARS(n)
}

function formatMiles(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
  if (n >= 1_000)     return `${(n / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}k`
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function formatFechaCorta(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${meses[m - 1]} ${String(y).slice(2)}`
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR')
}

function calcProduccionTn(row: CosechaRow): number {
  return (row.rendimiento * row.superficie_ha) / 1000
}

function extractTemporadas(cosechas: CosechaRow[]): string[] {
  return [...new Set(cosechas.map((c) => c.temporada))].sort().reverse()
}

// ── Animation ─────────────────────────────────────────────────────────────────

const sectionVariant = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } }
}

// ── Chart data types ──────────────────────────────────────────────────────────

interface TemporadaBar   { temporada: string; [cultivo: string]: string | number }
interface LoteBar        { lote: string;      [cultivo: string]: string | number }
interface PrecioPoint    { fecha: string;     [cultivo: string]: string | number }

interface ProyeccionRow {
  cosecha:   CosechaRow
  avgRend:   number
  estTn:     number
  estValor:  number
  baseLabel: string
}

// ── Pure chart-data builders ──────────────────────────────────────────────────

function buildProduccionPorTemporada(cosechas: CosechaRow[]): TemporadaBar[] {
  const completed  = cosechas.filter((c) => c.rendimiento > 0)
  const temporadas = [...new Set(completed.map((c) => c.temporada))].sort()
  const cultivos   = [...new Set(completed.map((c) => c.cultivo_nombre))]

  return temporadas.map((temporada) => {
    const row: TemporadaBar = { temporada }
    for (const cultivo of cultivos) {
      const tn = completed
        .filter((c) => c.temporada === temporada && c.cultivo_nombre === cultivo)
        .reduce((s, c) => s + calcProduccionTn(c), 0)
      if (tn > 0) row[cultivo] = parseFloat(tn.toFixed(2))
    }
    return row
  })
}

function buildValorPorCultivo(
  cosechas: CosechaRow[],
  precioMap: Map<number, number>
): { nombre: string; valor: number; fill: string }[] {
  const completed = cosechas.filter((c) => c.rendimiento > 0)
  const map: Record<string, { valor: number; fill: string }> = {}

  for (const c of completed) {
    const precio = precioMap.get(c.cultivo_id)
    if (!precio) continue
    const valor = calcProduccionTn(c) * precio
    if (!map[c.cultivo_nombre])
      map[c.cultivo_nombre] = { valor: 0, fill: colorForCultivo(c.cultivo_nombre) }
    map[c.cultivo_nombre].valor += valor
  }

  return Object.entries(map)
    .map(([nombre, { valor, fill }]) => ({ nombre, valor, fill }))
    .sort((a, b) => b.valor - a.valor)
}

function buildRendimientoPorLote(cosechas: CosechaRow[]): LoteBar[] {
  const completed = cosechas.filter((c) => c.rendimiento > 0)
  const lotes     = [...new Set(completed.map((c) => c.lote_nombre))].sort()

  return lotes.map((lote) => {
    const row: LoteBar     = { lote }
    const loteCosechas     = completed.filter((c) => c.lote_nombre === lote)
    const cultivos         = [...new Set(loteCosechas.map((c) => c.cultivo_nombre))]

    for (const cultivo of cultivos) {
      const cc  = loteCosechas.filter((c) => c.cultivo_nombre === cultivo)
      const avg = cc.reduce((s, c) => s + c.rendimiento, 0) / cc.length
      row[cultivo] = parseFloat(avg.toFixed(0))
    }
    return row
  })
}

function buildPrecioHistory(precios: PrecioCacheRow[]): PrecioPoint[] {
  const sorted = [...precios].sort((a, b) => a.fecha_precio.localeCompare(b.fecha_precio))
  const map    = new Map<string, PrecioPoint>()

  for (const p of sorted) {
    if (!map.has(p.fecha_precio))
      map.set(p.fecha_precio, { fecha: formatFechaCorta(p.fecha_precio) })
    map.get(p.fecha_precio)![p.cultivo_nombre] = p.precio_ton
  }

  return [...map.values()]
}

function buildProyecciones(
  filtered:   CosechaRow[],
  allHistory: CosechaRow[],
  precioMap:  Map<number, number>
): ProyeccionRow[] {
  const inProgress = filtered.filter((c) => c.rendimiento === 0 && !c.fecha_cosecha)
  const historicos  = allHistory.filter((c) => c.rendimiento > 0)

  return inProgress.map((c) => {
    const porLote    = historicos.filter((h) => h.cultivo_id === c.cultivo_id && h.lote_id === c.lote_id)
    const porCultivo = historicos.filter((h) => h.cultivo_id === c.cultivo_id)
    const source     = porLote.length > 0 ? porLote : porCultivo
    const avgRend    = source.length > 0
      ? source.reduce((s, h) => s + h.rendimiento, 0) / source.length
      : 0

    const estTn    = (avgRend * c.superficie_ha) / 1000
    const precio   = precioMap.get(c.cultivo_id) ?? 0

    return {
      cosecha:   c,
      avgRend:   parseFloat(avgRend.toFixed(0)),
      estTn:     parseFloat(estTn.toFixed(2)),
      estValor:  parseFloat((estTn * precio).toFixed(0)),
      baseLabel: porLote.length > 0 ? 'Historial del lote' : 'Promedio general'
    }
  })
}

// ── Shared tooltip style ──────────────────────────────────────────────────────

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--surface-border)',
  background: 'var(--surface-overlay)',
  color: 'var(--text-color)'
}

// ── ChartCard wrapper ─────────────────────────────────────────────────────────

function ChartCard({
  title,
  children,
  style
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className="card surface-0 border-round-lg shadow-1 flex flex-column gap-2"
      style={{ padding: '1.25rem', ...style }}
    >
      <span className="font-semibold" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>
        {title}
      </span>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Reportes() {
  const [cosechas, setCosechas] = useState<CosechaRow[]>([])
  const [cultivos, setCultivos] = useState<Cultivo[]>([])
  const [lotes,    setLotes]    = useState<LoteRow[]>([])
  const [precios,  setPrecios]  = useState<PrecioCacheRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [exporting, setExporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [filterCultivoId, setFilterCultivoId] = useState<number | null>(null)
  const [filterLoteId,    setFilterLoteId]    = useState<number | null>(null)
  const [filterTemporada, setFilterTemporada] = useState<string>('')

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, cu, l, p] = await Promise.all([
        cosechasService.getAll(),
        cultivosService.getAll(),
        lotesService.getAll(),
        preciosService.getAll()
      ])
      setCosechas(c)
      setCultivos(cu)
      setLotes(l)
      setPrecios(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    cosechas.filter((c) => {
      if (filterCultivoId !== null && c.cultivo_id !== filterCultivoId) return false
      if (filterLoteId    !== null && c.lote_id    !== filterLoteId)    return false
      if (filterTemporada && !c.temporada.includes(filterTemporada))    return false
      return true
    }),
    [cosechas, filterCultivoId, filterLoteId, filterTemporada]
  )

  const completedFiltered = useMemo(() => filtered.filter((c) => c.rendimiento > 0), [filtered])

  // Latest price per cultivo (precios come sorted DESC from IPC - first occurrence is latest)
  const latestPrecioMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of precios)
      if (!map.has(p.cultivo_id)) map.set(p.cultivo_id, p.precio_ton)
    return map
  }, [precios])

  const totalProduccion = useMemo(
    () => completedFiltered.reduce((s, c) => s + calcProduccionTn(c), 0),
    [completedFiltered]
  )

  const totalValor = useMemo(
    () => completedFiltered.reduce((s, c) => {
      const precio = latestPrecioMap.get(c.cultivo_id)
      return precio ? s + calcProduccionTn(c) * precio : s
    }, 0),
    [completedFiltered, latestPrecioMap]
  )

  // ── Chart data ─────────────────────────────────────────────────────────────

  const produccionPorTemporada = useMemo(
    () => buildProduccionPorTemporada(filtered), [filtered]
  )

  const valorPorCultivo = useMemo(
    () => buildValorPorCultivo(filtered, latestPrecioMap), [filtered, latestPrecioMap]
  )

  const rendimientoPorLote = useMemo(
    () => buildRendimientoPorLote(filtered), [filtered]
  )

  const precioHistory = useMemo(
    () => buildPrecioHistory(precios), [precios]
  )

  const proyecciones = useMemo(
    () => buildProyecciones(filtered, cosechas, latestPrecioMap),
    [filtered, cosechas, latestPrecioMap]
  )

  const totalProyectado = useMemo(
    () => proyecciones.reduce((s, p) => s + p.estValor, 0), [proyecciones]
  )

  // Unique cultivos present in completed filtered data (drives chart bar/line sets)
  const cultivosEnUso = useMemo(
    () => [...new Set(completedFiltered.map((c) => c.cultivo_nombre))].sort(),
    [completedFiltered]
  )

  const cultivosEnPrecios = useMemo(
    () => [...new Set(precios.map((p) => p.cultivo_nombre))].sort(),
    [precios]
  )

  const temporadas    = extractTemporadas(cosechas)
  const hasFilters    = filterCultivoId !== null || filterLoteId !== null || filterTemporada !== ''
  const hasChartData  = completedFiltered.length > 0
  const hasPrecioData = precioHistory.length >= 2

  // ── Filters ────────────────────────────────────────────────────────────────
  function clearFilters() {
    setFilterCultivoId(null)
    setFilterLoteId(null)
    setFilterTemporada('')
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function handleExport() {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      const detailData = completedFiltered.map((c) => {
        const tn     = calcProduccionTn(c)
        const precio = latestPrecioMap.get(c.cultivo_id)
        return {
          Temporada:              c.temporada,
          Cultivo:                c.cultivo_nombre,
          Lote:                   c.lote_nombre,
          'Superficie (ha)':      c.superficie_ha,
          'Fecha cosecha':        c.fecha_cosecha ?? '',
          'Rendimiento (kg/ha)':  c.rendimiento,
          'Humedad (%)':          c.humedad_pct ?? '',
          'Producción (tn)':      parseFloat(tn.toFixed(2)),
          'Precio ref. (ARS/tn)': precio ?? '',
          'Valor estimado (ARS)': precio ? parseFloat((tn * precio).toFixed(0)) : '',
          Observaciones:          c.observaciones ?? ''
        }
      })

      const detailWs = XLSX.utils.json_to_sheet(detailData)
      detailWs['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ]
      XLSX.utils.book_append_sheet(wb, detailWs, 'Cosechas')

      const summaryMap: Record<string, { cosechas: number; produccion: number; valor: number }> = {}
      for (const c of completedFiltered) {
        const tn    = calcProduccionTn(c)
        const precio = latestPrecioMap.get(c.cultivo_id) ?? 0
        if (!summaryMap[c.cultivo_nombre])
          summaryMap[c.cultivo_nombre] = { cosechas: 0, produccion: 0, valor: 0 }
        summaryMap[c.cultivo_nombre].cosechas    += 1
        summaryMap[c.cultivo_nombre].produccion  += tn
        summaryMap[c.cultivo_nombre].valor       += tn * precio
      }

      const summaryWs = XLSX.utils.json_to_sheet(
        Object.entries(summaryMap).map(([cultivo, s]) => ({
          Cultivo:                  cultivo,
          'Cantidad cosechas':      s.cosechas,
          'Producción total (tn)':  parseFloat(s.produccion.toFixed(2)),
          'Valor estimado (ARS)':   parseFloat(s.valor.toFixed(0))
        }))
      )
      summaryWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen por cultivo')

      const parts = ['cosechas']
      if (filterTemporada) parts.push(filterTemporada.replace('/', '-'))
      if (filterCultivoId) {
        const c = cultivos.find((c) => c.id === filterCultivoId)
        if (c) parts.push(c.nombre.toLowerCase())
      }
      parts.push(new Date().toISOString().slice(0, 10))
      XLSX.writeFile(wb, parts.join('_') + '.xlsx')
    } finally {
      setExporting(false)
    }
  }

  // ── Column templates ───────────────────────────────────────────────────────
  const temporadaTemplate   = (row: CosechaRow) => <Tag value={row.temporada} severity="success" rounded />
  const produccionTemplate  = (row: CosechaRow) => (
    <span className="font-semibold">
      {calcProduccionTn(row).toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
    </span>
  )
  const valorTemplate = (row: CosechaRow) => {
    const precio = latestPrecioMap.get(row.cultivo_id)
    if (!precio) return <span style={{ color: 'var(--text-color-secondary)' }}>-</span>
    const valor = calcProduccionTn(row) * precio
    return (
      <div className="flex flex-column" style={{ alignItems: 'flex-end', gap: '0.1rem' }}>
        <span>{formatARSCorto(valor)}</span>
        {valor >= 1_000_000 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
            {formatARS(valor)}
          </span>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-3">

      {/* Filters */}
      <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1rem' }}>
        <div className="flex align-items-center justify-content-between mb-3">
          <span className="text-xl font-bold text-800">Reportes y Exportación</span>
          {hasFilters && (
            <Button
              label="Limpiar filtros"
              icon="pi pi-filter-slash"
              text
              severity="secondary"
              size="small"
              onClick={clearFilters}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-column gap-1" style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label className="text-sm text-600 font-semibold">Cultivo</label>
            <Dropdown
              value={filterCultivoId}
              options={cultivos}
              optionLabel="nombre"
              optionValue="id"
              onChange={(e) => setFilterCultivoId(e.value)}
              placeholder="Todos los cultivos"
              showClear
            />
          </div>
          <div className="flex flex-column gap-1" style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label className="text-sm text-600 font-semibold">Lote</label>
            <Dropdown
              value={filterLoteId}
              options={lotes}
              optionLabel="nombre"
              optionValue="id"
              onChange={(e) => setFilterLoteId(e.value)}
              placeholder="Todos los lotes"
              showClear
            />
          </div>
          <div className="flex flex-column gap-1" style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label className="text-sm text-600 font-semibold">Temporada</label>
            <Dropdown
              value={filterTemporada}
              options={temporadas.map((t) => ({ label: t, value: t }))}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setFilterTemporada(e.value ?? '')}
              placeholder="Todas las temporadas"
              showClear
            />
          </div>
        </div>
      </div>

      {/* Analytics - only when there is data */}
      {cosechas.length > 0 && (
        <>
          {/* Summary stat cards */}
          <motion.div
            className="flex flex-wrap gap-3"
            variants={sectionVariant}
            initial="hidden"
            animate="visible"
          >
            {[
              {
                label: 'Registros',
                value: filtered.length.toString(),
                color: '#2196f3'
              },
              {
                label: 'Producción (completada)',
                value: formatTn(totalProduccion),
                color: '#9c27b0'
              },
              ...(totalValor > 0 ? [{
                label: 'Valor estimado',
                value: formatARSCorto(totalValor),
                detail: totalValor >= 1_000_000 ? formatARS(totalValor) : undefined,
                color: '#4caf50'
              }] : []),
              ...(totalProyectado > 0 ? [{
                label: 'Proyección en curso',
                value: formatARSCorto(totalProyectado),
                detail: totalProyectado >= 1_000_000 ? formatARS(totalProyectado) : undefined,
                color: '#ff9800'
              }] : [])
            ].map(({ label, value, detail, color }) => (
              <div
                key={label}
                className="card surface-0 border-round-lg shadow-1 flex align-items-center gap-3"
                style={{
                  padding: '0.85rem 1.25rem',
                  flex: '1 1 180px',
                  borderLeft: `4px solid ${color}`
                }}
              >
                <div className="flex flex-column gap-1">
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-color)', whiteSpace: 'nowrap' }}>
                    {value}
                  </span>
                  {detail && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
                      {detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Main charts row: production grouped bar + value donut */}
          {hasChartData && (
            <motion.div
              className="flex flex-wrap gap-3"
              variants={sectionVariant}
              initial="hidden"
              animate="visible"
            >
              <ChartCard title="Producción por temporada (tn)" style={{ flex: '2 1 380px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={produccionPorTemporada} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                    <XAxis
                      dataKey="temporada"
                      tick={{ fontSize: 12, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${formatMiles(Number(v))} tn`}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v, name) => [formatTn(Number(v)), name as string]}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'var(--surface-hover)' }}
                    />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.8rem', paddingTop: 4 }} />
                    {cultivosEnUso.map((cultivo) => (
                      <Bar
                        key={cultivo}
                        dataKey={cultivo}
                        fill={colorForCultivo(cultivo)}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={40}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {valorPorCultivo.length > 0 && (
                <ChartCard title="Valor estimado por cultivo" style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={valorPorCultivo}
                        dataKey="valor"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="75%"
                        paddingAngle={3}
                      >
                        {valorPorCultivo.map((entry) => (
                          <Cell key={entry.nombre} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [formatARS(Number(v)), name as string]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.8rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </motion.div>
          )}

          {/* Price history line chart */}
          {hasPrecioData && (
            <motion.div variants={sectionVariant} initial="hidden" animate="visible">
              <ChartCard title="Evolución de precios de referencia (ARS/tn)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={precioHistory} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 12, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${formatMiles(Number(v))}`}
                      width={52}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        `$ ${Number(v).toLocaleString('es-AR')} ARS/tn`,
                        name as string
                      ]}
                      contentStyle={tooltipStyle}
                    />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.8rem', paddingTop: 4 }} />
                    {cultivosEnPrecios.map((cultivo) => (
                      <Line
                        key={cultivo}
                        type="monotone"
                        dataKey={cultivo}
                        stroke={colorForCultivo(cultivo)}
                        strokeWidth={2}
                        dot={{ r: 3, fill: colorForCultivo(cultivo) }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </motion.div>
          )}

          {/* Rendimiento por lote - horizontal grouped bar */}
          {hasChartData && rendimientoPorLote.length > 0 && (
            <motion.div variants={sectionVariant} initial="hidden" animate="visible">
              <ChartCard title="Rendimiento promedio por lote (kg/ha)">
                <ResponsiveContainer width="100%" height={Math.max(180, rendimientoPorLote.length * 52)}>
                  <BarChart
                    layout="vertical"
                    data={rendimientoPorLote}
                    margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${Number(v).toLocaleString('es-AR')}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="lote"
                      tick={{ fontSize: 11, fill: 'var(--text-color-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                      tickFormatter={(v: string) => v.replace(/^LOTE\s*/i, '').replace(/"/g, '')}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        `${Number(v).toLocaleString('es-AR')} kg/ha`,
                        name as string
                      ]}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'var(--surface-hover)' }}
                    />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.8rem', paddingTop: 4 }} />
                    {cultivosEnUso.map((cultivo) => (
                      <Bar
                        key={cultivo}
                        dataKey={cultivo}
                        fill={colorForCultivo(cultivo)}
                        radius={[0, 3, 3, 0]}
                        maxBarSize={18}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </motion.div>
          )}

          {/* Projection section */}
          {proyecciones.length > 0 && (
            <motion.div variants={sectionVariant} initial="hidden" animate="visible">
              <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1.25rem' }}>
                <div className="flex align-items-center gap-2 mb-3">
                  <TrendingUp size={16} color="var(--brand-light)" strokeWidth={2} />
                  <span className="font-semibold" style={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>
                    Proyección de campaña en curso
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>
                    - rendimiento estimado en base a historial, precio de referencia actual
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {proyecciones.map((p, i) => (
                    <div
                      key={i}
                      className="border-round-lg"
                      style={{
                        flex: '1 1 220px',
                        padding: '0.9rem 1rem',
                        background: 'var(--surface-50)',
                        border: '1px solid var(--surface-border)'
                      }}
                    >
                      <div className="flex align-items-center justify-content-between mb-2">
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                          {p.cosecha.lote_nombre.replace(/^LOTE\s*/i, '').replace(/"/g, '')}
                        </span>
                        <Tag
                          value={p.cosecha.cultivo_nombre}
                          style={{
                            background: colorForCultivo(p.cosecha.cultivo_nombre),
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                          rounded
                        />
                      </div>
                      <div className="flex flex-column gap-1">
                        <div className="flex justify-content-between">
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>Rend. estimado</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-color)' }}>
                            {p.avgRend.toLocaleString('es-AR')} kg/ha
                          </span>
                        </div>
                        <div className="flex justify-content-between">
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>Producción est.</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-color)' }}>
                            {formatTn(p.estTn)}
                          </span>
                        </div>
                        {p.estValor > 0 && (
                          <div className="flex justify-content-between align-items-start">
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>Valor proy.</span>
                            <div className="flex flex-column" style={{ alignItems: 'flex-end', gap: '0.1rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-light)' }}>
                                {formatARSCorto(p.estValor)}
                              </span>
                              {p.estValor >= 1_000_000 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
                                  {formatARS(p.estValor)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>
                        {p.baseLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Data preview - collapsible, export always visible */}
      <motion.div
        className="card surface-0 border-round-lg shadow-1"
        style={{ padding: '1rem' }}
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
      >
        <div className="flex align-items-center justify-content-between">
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 0, color: 'var(--text-color)'
            }}
          >
            <motion.span
              animate={{ rotate: previewOpen ? 0 : -90 }}
              transition={{ duration: 0.18, ease: 'easeOut' as const }}
              style={{ display: 'flex' }}
            >
              <ChevronDown size={15} strokeWidth={2} />
            </motion.span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Vista previa de datos</span>
            {filtered.length > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-color-secondary)' }}>
                ({filtered.length} registro{filtered.length !== 1 ? 's' : ''})
              </span>
            )}
          </button>
          <Button
            label={exporting ? 'Exportando…' : 'Exportar a Excel'}
            icon={exporting ? 'pi pi-spin pi-spinner' : 'pi pi-file-excel'}
            severity="success"
            size="small"
            onClick={handleExport}
            disabled={completedFiltered.length === 0 || exporting}
          />
        </div>

        <AnimatePresence>
          {previewOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' as const }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '1rem' }}>
                {cosechas.length === 0 && !loading ? (
                  <Message
                    severity="info"
                    icon="pi pi-info-circle"
                    text="No hay cosechas registradas para exportar."
                    className="w-full"
                  />
                ) : (
                  <DataTable
                    value={filtered}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    emptyMessage="Ninguna cosecha coincide con los filtros seleccionados."
                    sortField="temporada"
                    sortOrder={-1}
                    stripedRows
                    rowHover
                    size="normal"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                    style={{ fontSize: '0.9rem' }}
                  >
                    <Column field="temporada"     header="Temporada"    body={temporadaTemplate} sortable style={{ width: '120px' }} />
                    <Column field="cultivo_nombre" header="Cultivo"                               sortable style={{ width: '110px' }} />
                    <Column field="lote_nombre"    header="Lote"                                  sortable style={{ minWidth: '130px' }} />
                    <Column
                      field="superficie_ha"
                      header="Sup. (ha)"
                      sortable
                      style={{ width: '90px' }}
                      align="right"
                      body={(row: CosechaRow) => row.superficie_ha.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    />
                    <Column
                      field="fecha_cosecha"
                      header="Fecha"
                      body={(row: CosechaRow) => formatDate(row.fecha_cosecha)}
                      sortable
                      style={{ width: '110px' }}
                    />
                    <Column
                      field="rendimiento"
                      header="Rend. (kg/ha)"
                      sortable
                      style={{ width: '120px' }}
                      align="right"
                      body={(row: CosechaRow) =>
                        row.rendimiento > 0
                          ? row.rendimiento.toLocaleString('es-AR', { maximumFractionDigits: 2 })
                          : <span style={{ color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>en curso</span>
                      }
                    />
                    <Column header="Producción"  body={produccionTemplate} sortable sortField="rendimiento" style={{ width: '120px' }} align="right" />
                    <Column header="Valor est."   body={valorTemplate}                                        style={{ width: '140px' }} align="right" />
                  </DataTable>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  )
}
