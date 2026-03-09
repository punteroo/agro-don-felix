import { useState, useEffect, useRef, useCallback } from 'react'
import { DataTable, type DataTableFilterMeta } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toolbar } from 'primereact/toolbar'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { InputText } from 'primereact/inputtext'
import { FilterMatchMode } from 'primereact/api'
import { lotesService } from '../services/ipc'
import LoteFormDialog, { type LotePayload } from '../components/Lotes/LoteFormDialog'
import type { LoteRow } from '../types/domain'

// ── Component ─────────────────────────────────────────────────────────────────

export default function Lotes() {
  const toast = useRef<Toast>(null)

  // ── Data state ─────────────────────────────────────────────────────────────
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [loading, setLoading] = useState(true)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [globalFilter, setGlobalFilter] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<LoteRow | null>(null)

  const [filters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
  })

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      setLotes(await lotesService.getAll())
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los lotes.',
        life: 4000
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleSave(payload: LotePayload, editId?: number) {
    try {
      if (editId !== undefined) {
        await lotesService.update(editId, payload)
        toast.current?.show({
          severity: 'success',
          summary: 'Guardado',
          detail: 'El lote fue actualizado correctamente.',
          life: 3000
        })
      } else {
        await lotesService.create(payload)
        toast.current?.show({
          severity: 'success',
          summary: 'Creado',
          detail: 'El lote fue agregado exitosamente.',
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
      throw err
    }
  }

  function handleDeleteConfirm(row: LoteRow) {
    const hasCosechas = row.cosecha_count > 0
    confirmDialog({
      message: (
        <div className="flex flex-column gap-2">
          <span>
            ¿Eliminar el lote <strong>{row.nombre}</strong>?
          </span>
          {hasCosechas && (
            <Tag
              icon="pi pi-exclamation-triangle"
              severity="danger"
              value={`Este lote tiene ${row.cosecha_count} cosecha${row.cosecha_count !== 1 ? 's' : ''} registrada${row.cosecha_count !== 1 ? 's' : ''}. Se eliminarán también.`}
              style={{ whiteSpace: 'normal', textAlign: 'left' }}
            />
          )}
          <span className="text-500 text-sm">Esta acción no se puede deshacer.</span>
        </div>
      ),
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await lotesService.delete(row.id)
          toast.current?.show({
            severity: 'warn',
            summary: 'Eliminado',
            detail: `El lote "${row.nombre}" fue eliminado.`,
            life: 3000
          })
          await loadAll()
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar el lote.',
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

  function openEdit(row: LoteRow) {
    setEditTarget(row)
    setFormVisible(true)
  }

  // ── Column templates ────────────────────────────────────────────────────────

  const superficieTemplate = (row: LoteRow) =>
    `${row.superficie_ha.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ha`

  const ubicacionTemplate = (row: LoteRow) =>
    row.ubicacion ? (
      <span>
        <i className="pi pi-map-marker text-500 mr-1" style={{ fontSize: '0.8rem' }} />
        {row.ubicacion}
      </span>
    ) : (
      <span className="text-400">—</span>
    )

  const cosechaCountTemplate = (row: LoteRow) =>
    row.cosecha_count > 0 ? (
      <Tag
        value={`${row.cosecha_count} cosecha${row.cosecha_count !== 1 ? 's' : ''}`}
        severity="success"
        rounded
      />
    ) : (
      <Tag value="Sin cosechas" severity="secondary" rounded />
    )

  const produccionTemplate = (row: LoteRow) =>
    row.produccion_total_tn > 0 ? (
      <span className="font-semibold">
        {row.produccion_total_tn.toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
      </span>
    ) : (
      <span className="text-400">—</span>
    )

  const accionesTemplate = (row: LoteRow) => (
    <div className="flex gap-2 justify-content-center">
      <Button
        icon="pi pi-pencil"
        rounded
        text
        severity="info"
        tooltip="Editar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => openEdit(row)}
        aria-label="Editar lote"
      />
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => handleDeleteConfirm(row)}
        aria-label="Eliminar lote"
      />
    </div>
  )

  // ── Aggregated footer ──────────────────────────────────────────────────────

  const totalSuperficie = lotes.reduce((sum, l) => sum + l.superficie_ha, 0)
  const totalProduccion = lotes.reduce((sum, l) => sum + l.produccion_total_tn, 0)

  const superficieFooter = () => (
    <span className="font-bold">
      {totalSuperficie.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ha
    </span>
  )

  const produccionFooter = () => (
    <span className="font-bold">
      {totalProduccion.toLocaleString('es-AR', { maximumFractionDigits: 2 })} tn
    </span>
  )

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbarLeft = (
    <div className="flex align-items-center gap-3">
      <span className="text-xl font-bold text-800">Gestión de Lotes</span>
      {!loading && lotes.length > 0 && (
        <Tag
          value={`${lotes.length} lote${lotes.length !== 1 ? 's' : ''}`}
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
          placeholder="Buscar por nombre o ubicación…"
          style={{ width: '240px' }}
        />
      </div>
      <Button
        label="Nuevo lote"
        icon="pi pi-plus"
        severity="success"
        onClick={openCreate}
      />
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-3">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1rem' }}>
        <Toolbar start={toolbarLeft} end={toolbarRight} className="mb-3 border-none p-0" />

        <DataTable
          value={lotes}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          filters={filters}
          globalFilter={globalFilter}
          globalFilterFields={['nombre', 'ubicacion']}
          emptyMessage='No hay lotes registrados. Agregue uno con el botón "Nuevo lote".'
          sortField="nombre"
          sortOrder={1}
          stripedRows
          rowHover
          size="normal"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          style={{ fontSize: '0.95rem' }}
        >
          <Column
            field="nombre"
            header="Nombre del lote"
            sortable
            style={{ minWidth: '180px' }}
          />
          <Column
            field="ubicacion"
            header="Ubicación"
            body={ubicacionTemplate}
            sortable
            style={{ minWidth: '160px' }}
          />
          <Column
            field="superficie_ha"
            header="Superficie"
            body={superficieTemplate}
            footer={superficieFooter}
            sortable
            style={{ width: '130px' }}
            align="right"
          />
          <Column
            field="cosecha_count"
            header="Cosechas"
            body={cosechaCountTemplate}
            sortable
            style={{ width: '150px' }}
            align="center"
          />
          <Column
            field="produccion_total_tn"
            header="Producción total"
            body={produccionTemplate}
            footer={produccionFooter}
            sortable
            style={{ width: '160px' }}
            align="right"
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

      <LoteFormDialog
        visible={formVisible}
        onHide={() => setFormVisible(false)}
        onSave={handleSave}
        lote={editTarget}
      />
    </div>
  )
}

