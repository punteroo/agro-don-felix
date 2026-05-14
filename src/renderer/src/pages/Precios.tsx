import { useState, useEffect, useRef, useCallback } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toolbar } from 'primereact/toolbar'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Message } from 'primereact/message'
import { preciosService, cultivosService } from '../services/ipc'
import PrecioFormDialog from '../components/Precios/PrecioFormDialog'
import type { PrecioCacheRow, PrecioPayload, Cultivo } from '../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR')
}

function formatARS(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Precios() {
  const toast = useRef<Toast>(null)

  const [precios, setPrecios] = useState<PrecioCacheRow[]>([])
  const [cultivos, setCultivos] = useState<Cultivo[]>([])
  const [loading, setLoading] = useState(true)
  const [formVisible, setFormVisible] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([preciosService.getAll(), cultivosService.getAll()])
      setPrecios(p)
      setCultivos(c)
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los precios.',
        life: 4000
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Determine which rows are the "latest" per cultivo ──────────────────────
  const latestIdPerCultivo = new Set<number>()
  const seen = new Set<number>()
  for (const p of precios) {
    // precios come ordered by fecha_precio DESC — first occurrence per cultivo_id is latest
    if (!seen.has(p.cultivo_id)) {
      latestIdPerCultivo.add(p.id)
      seen.add(p.cultivo_id)
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSave(payload: PrecioPayload) {
    try {
      await preciosService.upsert(payload)
      toast.current?.show({
        severity: 'success',
        summary: 'Guardado',
        detail: 'El precio fue registrado correctamente.',
        life: 3000
      })
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

  function handleDeleteConfirm(row: PrecioCacheRow) {
    confirmDialog({
      message: (
        <span>
          ¿Eliminar el precio de <strong>{row.cultivo_nombre}</strong> del{' '}
          <strong>{formatDate(row.fecha_precio)}</strong>?
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
          await preciosService.delete(row.id)
          toast.current?.show({
            severity: 'warn',
            summary: 'Eliminado',
            detail: 'El precio fue eliminado.',
            life: 3000
          })
          await loadAll()
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar el precio.',
            life: 4000
          })
        }
      }
    })
  }

  // ── Column templates ───────────────────────────────────────────────────────
  const cultivoTemplate = (row: PrecioCacheRow) => {
    const isLatest = latestIdPerCultivo.has(row.id)
    return (
      <div className="flex align-items-center gap-2">
        <span>{row.cultivo_nombre}</span>
        {isLatest && (
          <Tag value="último" severity="success" rounded style={{ fontSize: '0.7rem' }} />
        )}
      </div>
    )
  }

  const precioTemplate = (row: PrecioCacheRow) => (
    <span className="font-semibold text-800">
      {formatARS(row.precio_ton)} <span className="text-400 font-normal text-sm">{row.moneda}/tn</span>
    </span>
  )

  const fechaTemplate = (row: PrecioCacheRow) => formatDate(row.fecha_precio)

  const registradoTemplate = (row: PrecioCacheRow) => {
    const dt = new Date(row.fetched_at)
    return (
      <span className="text-500 text-sm">
        {dt.toLocaleDateString('es-AR')} {dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  const accionesTemplate = (row: PrecioCacheRow) => (
    <Button
      icon="pi pi-trash"
      rounded
      text
      severity="danger"
      tooltip="Eliminar"
      tooltipOptions={{ position: 'top' }}
      onClick={() => handleDeleteConfirm(row)}
      aria-label="Eliminar precio"
    />
  )

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbarLeft = (
    <div className="flex align-items-center gap-3">
      <span className="text-xl font-bold text-800">Precios de Mercado</span>
      {!loading && precios.length > 0 && (
        <Tag
          value={`${precios.length} registro${precios.length !== 1 ? 's' : ''}`}
          severity="secondary"
          rounded
        />
      )}
    </div>
  )

  const toolbarRight = (
    <Button
      label="Registrar precio"
      icon="pi pi-plus"
      severity="success"
      onClick={() => setFormVisible(true)}
      disabled={cultivos.length === 0}
    />
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-3">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Message
        severity="info"
        icon="pi pi-info-circle"
        className="w-full"
        text="Los precios se registran manualmente. Se recomienda consultar MATba-ROFEX u otra fuente de referencia antes de cargar una cotización."
      />

      <div className="card surface-0 border-round-lg shadow-1" style={{ padding: '1rem' }}>
        <Toolbar start={toolbarLeft} end={toolbarRight} className="mb-3 border-none p-0" />

        {precios.length === 0 && !loading ? (
          <Message
            severity="secondary"
            icon="pi pi-chart-line"
            text='No hay precios registrados. Use el botón "Registrar precio" para agregar una cotización.'
            className="w-full"
          />
        ) : (
          <DataTable
            value={precios}
            loading={loading}
            paginator
            rows={15}
            rowsPerPageOptions={[15, 30, 50]}
            emptyMessage="No hay precios registrados."
            sortField="fecha_precio"
            sortOrder={-1}
            stripedRows
            rowHover
            size="normal"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            style={{ fontSize: '0.95rem' }}
            rowClassName={(row: PrecioCacheRow) =>
              latestIdPerCultivo.has(row.id) ? 'surface-100' : ''
            }
          >
            <Column
              field="cultivo_nombre"
              header="Cultivo"
              body={cultivoTemplate}
              sortable
              style={{ minWidth: '160px' }}
            />
            <Column
              field="precio_ton"
              header="Precio"
              body={precioTemplate}
              sortable
              style={{ width: '180px' }}
            />
            <Column
              field="fecha_precio"
              header="Fecha cotización"
              body={fechaTemplate}
              sortable
              style={{ width: '160px' }}
            />
            <Column
              field="fuente"
              header="Fuente"
              sortable
              style={{ width: '160px' }}
            />
            <Column
              field="fetched_at"
              header="Registrado"
              body={registradoTemplate}
              sortable
              style={{ width: '160px' }}
            />
            <Column
              header="Acciones"
              body={accionesTemplate}
              style={{ width: '90px' }}
              frozen
              alignFrozen="right"
              align="center"
            />
          </DataTable>
        )}
      </div>

      <PrecioFormDialog
        visible={formVisible}
        cultivos={cultivos}
        onHide={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </div>
  )
}
