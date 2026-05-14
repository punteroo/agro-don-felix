import { useState, useEffect, useCallback } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import * as XLSX from 'xlsx'
import { cosechasService, cultivosService, lotesService, preciosService } from '../services/ipc'
import type { CosechaRow, Cultivo, LoteRow, PrecioCacheRow } from '../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR')
}

function calcProduccionTn(row: CosechaRow): number {
  return (row.rendimiento * row.superficie_ha) / 1000
}

/** Build a sorted, deduplicated list of temporada strings from cosechas. */
function extractTemporadas(cosechas: CosechaRow[]): string[] {
  return [...new Set(cosechas.map((c) => c.temporada))].sort().reverse()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Reportes() {
  const [cosechas, setCosechas] = useState<CosechaRow[]>([])
  const [cultivos, setCultivos] = useState<Cultivo[]>([])
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [precios, setPrecios] = useState<PrecioCacheRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterCultivoId, setFilterCultivoId] = useState<number | null>(null)
  const [filterLoteId, setFilterLoteId] = useState<number | null>(null)
  const [filterTemporada, setFilterTemporada] = useState<string>('')

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, cu, l, p] = await Promise.all([
        cosechasService.getAll(),
        cultivosService.getAll(),
        lotesService.getAll(),
        preciosService.getLatest()
      ])
      setCosechas(c)
      setCultivos(cu)
      setLotes(l)
      setPrecios(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Derived filtered data ──────────────────────────────────────────────────
  const filtered = cosechas.filter((c) => {
    if (filterCultivoId !== null && c.cultivo_id !== filterCultivoId) return false
    if (filterLoteId !== null && c.lote_id !== filterLoteId) return false
    if (filterTemporada && !c.temporada.includes(filterTemporada)) return false
    return true
  })

  const precioMap = new Map(precios.map((p) => [p.cultivo_id, p.precio_ton]))

  const totalProduccion = filtered.reduce((s, c) => s + calcProduccionTn(c), 0)
  const totalValor = filtered.reduce((s, c) => {
    const precio = precioMap.get(c.cultivo_id)
    return precio ? s + calcProduccionTn(c) * precio : s
  }, 0)

  const temporadas = extractTemporadas(cosechas)
  const hasFilters = filterCultivoId !== null || filterLoteId !== null || filterTemporada !== ''

  // ── Clear filters ──────────────────────────────────────────────────────────
  function clearFilters() {
    setFilterCultivoId(null)
    setFilterLoteId(null)
    setFilterTemporada('')
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  function handleExport() {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // Detail sheet
      const detailData = filtered.map((c) => {
        const tn = calcProduccionTn(c)
        const precio = precioMap.get(c.cultivo_id)
        return {
          Temporada: c.temporada,
          Cultivo: c.cultivo_nombre,
          Lote: c.lote_nombre,
          'Superficie (ha)': c.superficie_ha,
          'Fecha cosecha': c.fecha_cosecha ?? '',
          'Rendimiento (kg/ha)': c.rendimiento,
          'Humedad (%)': c.humedad_pct ?? '',
          'Producción (tn)': parseFloat(tn.toFixed(2)),
          'Precio ref. (ARS/tn)': precio ?? '',
          'Valor estimado (ARS)': precio ? parseFloat((tn * precio).toFixed(0)) : '',
          Observaciones: c.observaciones ?? ''
        }
      })

      const detailWs = XLSX.utils.json_to_sheet(detailData)
      detailWs['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ]
      XLSX.utils.book_append_sheet(wb, detailWs, 'Cosechas')

      // Summary sheet by cultivo
      const summaryMap: Record<string, { cosechas: number; produccion: number; valor: number }> = {}
      for (const c of filtered) {
        const tn = calcProduccionTn(c)
        const precio = precioMap.get(c.cultivo_id) ?? 0
        if (!summaryMap[c.cultivo_nombre])
          summaryMap[c.cultivo_nombre] = { cosechas: 0, produccion: 0, valor: 0 }
        summaryMap[c.cultivo_nombre].cosechas += 1
        summaryMap[c.cultivo_nombre].produccion += tn
        summaryMap[c.cultivo_nombre].valor += tn * precio
      }

      const summaryData = Object.entries(summaryMap).map(([cultivo, s]) => ({
        Cultivo: cultivo,
        'Cantidad cosechas': s.cosechas,
        'Producción total (tn)': parseFloat(s.produccion.toFixed(2)),
        'Valor estimado (ARS)': parseFloat(s.valor.toFixed(0))
      }))

      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      summaryWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen por cultivo')

      // Determine filename
      const parts = ['cosechas']
      if (filterTemporada) parts.push(filterTemporada.replace('/', '-'))
      if (filterCultivoId) {
        const c = cultivos.find((c) => c.id === filterCultivoId)
        if (c) parts.push(c.nombre.toLowerCase())
      }
      parts.push(new Date().toISOString().slice(0, 10))
      const filename = parts.join('_') + '.xlsx'

      XLSX.writeFile(wb, filename)
    } finally {
      setExporting(false)
    }
  }

  // ── Column templates ───────────────────────────────────────────────────────
  const temporadaTemplate = (row: CosechaRow) => (
    <Tag value={row.temporada} severity="success" rounded />
  )

  const produccionTemplate = (row: CosechaRow) => (
    <span className="font-semibold">
      {calcProduccionTn(row).toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
    </span>
  )

  const valorTemplate = (row: CosechaRow) => {
    const precio = precioMap.get(row.cultivo_id)
    if (!precio) return <span className="text-400">—</span>
    const valor = calcProduccionTn(row) * precio
    return (
      <span className="text-700">
        {valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
      </span>
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

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div
            className="card surface-0 border-round-lg shadow-1 flex align-items-center gap-3"
            style={{ padding: '0.8rem 1.2rem', flex: 1, minWidth: '160px' }}
          >
            <i className="pi pi-table text-blue-500" style={{ fontSize: '1.2rem' }} />
            <div>
              <div className="text-500 text-sm">Registros</div>
              <div className="font-bold text-lg">{filtered.length}</div>
            </div>
          </div>
          <div
            className="card surface-0 border-round-lg shadow-1 flex align-items-center gap-3"
            style={{ padding: '0.8rem 1.2rem', flex: 1, minWidth: '160px' }}
          >
            <i className="pi pi-box text-purple-500" style={{ fontSize: '1.2rem' }} />
            <div>
              <div className="text-500 text-sm">Producción total</div>
              <div className="font-bold text-lg">
                {totalProduccion.toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
              </div>
            </div>
          </div>
          {totalValor > 0 && (
            <div
              className="card surface-0 border-round-lg shadow-1 flex align-items-center gap-3"
              style={{ padding: '0.8rem 1.2rem', flex: 1, minWidth: '160px' }}
            >
              <i className="pi pi-dollar text-green-500" style={{ fontSize: '1.2rem' }} />
              <div>
                <div className="text-500 text-sm">Valor estimado (ARS)</div>
                <div className="font-bold text-lg">
                  {totalValor.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 0
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table + export */}
      <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1rem' }}>
        <div className="flex align-items-center justify-content-between mb-3">
          <span className="font-semibold text-700">
            Vista previa{' '}
            {filtered.length > 0 && (
              <span className="text-500 font-normal text-sm">
                ({filtered.length} registro{filtered.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          <Button
            label={exporting ? 'Exportando…' : 'Exportar a Excel'}
            icon={exporting ? 'pi pi-spin pi-spinner' : 'pi pi-file-excel'}
            severity="success"
            onClick={handleExport}
            disabled={filtered.length === 0 || exporting}
          />
        </div>

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
            <Column
              field="temporada"
              header="Temporada"
              body={temporadaTemplate}
              sortable
              style={{ width: '120px' }}
            />
            <Column field="cultivo_nombre" header="Cultivo" sortable style={{ width: '110px' }} />
            <Column field="lote_nombre" header="Lote" sortable style={{ minWidth: '130px' }} />
            <Column
              field="superficie_ha"
              header="Sup. (ha)"
              sortable
              style={{ width: '90px' }}
              align="right"
              body={(row: CosechaRow) =>
                row.superficie_ha.toLocaleString('es-AR', { maximumFractionDigits: 2 })
              }
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
                row.rendimiento.toLocaleString('es-AR', { maximumFractionDigits: 2 })
              }
            />
            <Column
              header="Producción"
              body={produccionTemplate}
              sortable
              sortField="rendimiento"
              style={{ width: '120px' }}
              align="right"
            />
            <Column
              header="Valor est."
              body={valorTemplate}
              style={{ width: '140px' }}
              align="right"
            />
          </DataTable>
        )}
      </div>
    </div>
  )
}
