import { useState, useEffect, useRef, useCallback } from 'react'
import { DataTable, type DataTableFilterMeta } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toolbar } from 'primereact/toolbar'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { FilterMatchMode } from 'primereact/api'
import { cosechasService, lotesService, cultivosService } from '../services/ipc'
import CosechaFormDialog from '../components/Cosechas/CosechaFormDialog'
import type { CosechaRow, CosechaPayload, Lote, Cultivo } from '../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR')
}

function formatKgHa(n: number): string {
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg/ha`
}

function calcProduccionTn(row: CosechaRow): number {
  return (row.rendimiento * row.superficie_ha) / 1000
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Cosechas() {
  const toast = useRef<Toast>(null)

  // ── Data state ─────────────────────────────────────────────────────────────
  const [cosechas, setCosechas] = useState<CosechaRow[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cultivos, setCultivos] = useState<Cultivo[]>([])
  const [loading, setLoading] = useState(true)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [globalFilter, setGlobalFilter] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<CosechaRow | null>(null)

  // ── Filter config ──────────────────────────────────────────────────────────
  const [filters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, l, cu] = await Promise.all([
        cosechasService.getAll(),
        lotesService.getAll(),
        cultivosService.getAll()
      ])
      setCosechas(c)
      setLotes(l)
      setCultivos(cu)
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los datos.',
        life: 4000
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleSave(payload: CosechaPayload, editId?: number) {
    try {
      if (editId !== undefined) {
        await cosechasService.update(editId, payload)
        toast.current?.show({
          severity: 'success',
          summary: 'Guardado',
          detail: 'La cosecha fue actualizada correctamente.',
          life: 3000
        })
      } else {
        await cosechasService.create(payload)
        toast.current?.show({
          severity: 'success',
          summary: 'Registrada',
          detail: 'La cosecha fue registrada exitosamente.',
          life: 3000
        })
      }
      await loadAll()
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error al guardar',
        detail: err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
        life: 5000
      })
      throw err // Re-throw so the dialog stays open
    }
  }

  function handleDeleteConfirm(row: CosechaRow) {
    confirmDialog({
      message: (
        <span>
          ¿Eliminar la cosecha de <strong>{row.cultivo_nombre}</strong> en{' '}
          <strong>{row.lote_nombre}</strong> ({row.temporada})?
          <br />
          <span className="text-500 text-sm">Esta acción no se puede deshacer.</span>
        </span>
      ),
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await cosechasService.delete(row.id)
          toast.current?.show({
            severity: 'warn',
            summary: 'Eliminada',
            detail: 'La cosecha fue eliminada.',
            life: 3000
          })
          await loadAll()
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la cosecha.',
            life: 4000
          })
        }
      }
    })
  }

  function openCreate() {
    setEditTarget(null)
    setFormVisible(true)
  }

  function openEdit(row: CosechaRow) {
    setEditTarget(row)
    setFormVisible(true)
  }

  // ── Column templates ────────────────────────────────────────────────────────
  const temporadaTemplate = (row: CosechaRow) => (
    <Tag value={row.temporada} severity="success" rounded />
  )

  const loteTemplate = (row: CosechaRow) => (
    <span>
      {row.lote_nombre}
      <span className="text-500 text-sm ml-2">({row.superficie_ha} ha)</span>
    </span>
  )

  const fechaTemplate = (row: CosechaRow) => formatDate(row.fecha_cosecha)

  const rendimientoTemplate = (row: CosechaRow) => formatKgHa(row.rendimiento)

  const produccionTemplate = (row: CosechaRow) => {
    const tn = calcProduccionTn(row)
    return (
      <span className="font-semibold">
        {tn.toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
      </span>
    )
  }

  const humedadTemplate = (row: CosechaRow) =>
    row.humedad_pct != null ? `${row.humedad_pct}%` : '—'

  const accionesTemplate = (row: CosechaRow) => (
    <div className="flex gap-2 justify-content-center">
      <Button
        icon="pi pi-pencil"
        rounded
        text
        severity="info"
        tooltip="Editar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => openEdit(row)}
        aria-label="Editar cosecha"
      />
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => handleDeleteConfirm(row)}
        aria-label="Eliminar cosecha"
      />
    </div>
  )

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbarLeft = (
    <div className="flex align-items-center gap-3">
      <span className="text-xl font-bold text-800">Gestión de Cosechas</span>
      {!loading && cosechas.length > 0 && (
        <Tag
          value={`${cosechas.length} registro${cosechas.length !== 1 ? 's' : ''}`}
          severity="secondary"
          rounded
        />
      )}
    </div>
  )

  const toolbarRight = (
    <div className="flex align-items-center gap-2">
      <div className="p-inputgroup">
        <span className="p-inputgroup-addon">
          <i className="pi pi-search" />
        </span>
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscar por temporada, lote, cultivo…"
          style={{ width: '260px' }}
        />
      </div>
      <Button
        label="Nueva cosecha"
        icon="pi pi-plus"
        severity="success"
        onClick={openCreate}
        disabled={lotes.length === 0}
        tooltip={lotes.length === 0 ? 'Primero agregue al menos un lote' : undefined}
        tooltipOptions={{ position: 'left' }}
      />
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-3">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Warning: no lotes */}
      {!loading && lotes.length === 0 && (
        <Message
          severity="warn"
          icon="pi pi-map"
          text="No hay lotes registrados. Diríjase a la sección Lotes para agregar uno antes de registrar cosechas."
          className="w-full"
        />
      )}

      <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1rem' }}>
        <Toolbar start={toolbarLeft} end={toolbarRight} className="mb-3 border-none p-0" />

        <DataTable
          value={cosechas}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          filters={filters}
          globalFilter={globalFilter}
          globalFilterFields={['temporada', 'lote_nombre', 'cultivo_nombre']}
          emptyMessage="No hay cosechas registradas."
          sortField="temporada"
          sortOrder={-1}
          stripedRows
          rowHover
          size="normal"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
          style={{ fontSize: '0.95rem' }}
        >
          <Column
            field="temporada"
            header="Temporada"
            body={temporadaTemplate}
            sortable
            style={{ width: '130px' }}
          />
          <Column
            field="cultivo_nombre"
            header="Cultivo"
            sortable
            style={{ width: '120px' }}
          />
          <Column
            field="lote_nombre"
            header="Lote"
            body={loteTemplate}
            sortable
            style={{ minWidth: '150px' }}
          />
          <Column
            field="fecha_cosecha"
            header="Fecha"
            body={fechaTemplate}
            sortable
            style={{ width: '120px' }}
          />
          <Column
            field="rendimiento"
            header="Rendimiento"
            body={rendimientoTemplate}
            sortable
            style={{ width: '140px' }}
          />
          <Column
            header="Producción total"
            body={produccionTemplate}
            sortable
            sortField="rendimiento"
            style={{ width: '150px' }}
          />
          <Column
            field="humedad_pct"
            header="Humedad"
            body={humedadTemplate}
            sortable
            style={{ width: '100px' }}
          />
          <Column
            header="Acciones"
            body={accionesTemplate}
            style={{ width: '110px' }}
            frozen
            alignFrozen="right"
            align="center"
          />
        </DataTable>
      </div>

      {/* Create / Edit dialog */}
      <CosechaFormDialog
        visible={formVisible}
        onHide={() => setFormVisible(false)}
        onSave={handleSave}
        cosecha={editTarget}
        lotes={lotes}
        cultivos={cultivos}
      />
    </div>
  )
}

