import { useState, useEffect, useCallback } from 'react'
import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { InputNumber, type InputNumberValueChangeEvent } from 'primereact/inputnumber'
import { Dropdown } from 'primereact/dropdown'
import { Calendar } from 'primereact/calendar'
import { InputTextarea } from 'primereact/inputtextarea'
import { Message } from 'primereact/message'
import { Divider } from 'primereact/divider'
import type { CosechaPayload, CosechaRow, Lote, Cultivo } from '../../types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the two year parts of the current Argentine agro season. */
function getDefaultTemporadaParts(): { yearA: number; yearB: number | null } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month < 7
    ? { yearA: year - 1, yearB: year }
    : { yearA: year, yearB: year + 1 }
}

function dateToIso(d: Date | null): string | undefined {
  if (!d) return undefined
  return d.toISOString().slice(0, 10)
}

function isoToDate(s: string | undefined): Date | null {
  if (!s) return null
  // Avoid timezone offset shifting the date: parse as local
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  lote_id: number | null
  cultivo_id: number | null
  temporadaA: number | null
  temporadaB: number | null
  fechaCosecha: Date | null
  /** Total production in tons entered by the user. rendimiento (kg/ha) is derived from this. */
  produccion_tn: number | null
  humedad_pct: number | null
  observaciones: string
}

interface FormErrors {
  lote_id?: string
  cultivo_id?: string
  temporada?: string
  produccion_tn?: string
}

interface Props {
  visible: boolean
  onHide: () => void
  /** Parent calls the IPC and shows Toast — returns on success, throws on error */
  onSave: (payload: CosechaPayload, editId?: number) => Promise<void>
  /** When set the dialog is in edit mode */
  cosecha?: CosechaRow | null
  lotes: Lote[]
  cultivos: Cultivo[]
}

// ── Initial state factory ─────────────────────────────────────────────────────

const emptyForm = (): FormState => {
  const { yearA, yearB } = getDefaultTemporadaParts()
  return {
    lote_id: null,
    cultivo_id: null,
    temporadaA: yearA,
    temporadaB: yearB,
    fechaCosecha: null,
    produccion_tn: null,
    humedad_pct: null,
    observaciones: ''
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CosechaFormDialog({ visible, onHide, onSave, cosecha, lotes, cultivos }: Props) {
  const isEdit = cosecha != null

  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  // Populate form whenever the dialog opens or the cosecha changes
  useEffect(() => {
    if (!visible) return
    if (isEdit && cosecha) {
      const parts = cosecha.temporada.split('/')
      const parsedA = parseInt(parts[0], 10)
      const parsedB = parts[1] ? parseInt(parts[1], 10) : null
      setForm({
        lote_id: cosecha.lote_id,
        cultivo_id: cosecha.cultivo_id,
        temporadaA: isNaN(parsedA) ? null : parsedA,
        temporadaB: parsedB !== null && !isNaN(parsedB) ? parsedB : null,
        fechaCosecha: isoToDate(cosecha.fecha_cosecha),
        // Back-calculate total tons from stored rendimiento x superficie_ha
        produccion_tn: cosecha.rendimiento > 0
          ? parseFloat(((cosecha.rendimiento * cosecha.superficie_ha) / 1000).toFixed(2))
          : 0,
        humedad_pct: cosecha.humedad_pct ?? null,
        observaciones: cosecha.observaciones ?? ''
      })
    } else {
      setForm(emptyForm())
    }
    setErrors({})
  }, [visible, cosecha, isEdit])

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {}
    if (!form.lote_id) e.lote_id = 'Seleccione un lote.'
    if (!form.cultivo_id) e.cultivo_id = 'Seleccione un cultivo.'
    if (!form.temporadaA) e.temporada = 'Ingrese el año de inicio.'
    else if (form.temporadaB !== null && form.temporadaB <= form.temporadaA)
      e.temporada = 'El año de fin debe ser mayor al año de inicio.'
    if (form.produccion_tn === null || form.produccion_tn < 0)
      e.produccion_tn = 'Ingrese la producción total (>= 0 tn).'
    return e
  }, [form])

  // ── Derived: rendimiento preview ──────────────────────────────────────────

  const selectedLote = lotes.find((l) => l.id === form.lote_id) ?? null
  // Shown once the user enters tn and a lote with known surface is selected
  const rendimientoCalc =
    selectedLote && form.produccion_tn !== null && form.produccion_tn > 0 && selectedLote.superficie_ha > 0
      ? ((form.produccion_tn * 1000) / selectedLote.superficie_ha).toLocaleString('es-AR', {
          maximumFractionDigits: 0
        })
      : null

  // ── Handlers ───────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear field error on change
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }

    // At this point required fields are guaranteed non-null by validation
    const temporada = form.temporadaB !== null
      ? `${form.temporadaA}/${form.temporadaB}`
      : `${form.temporadaA}`

    // Derive rendimiento (kg/ha) from user-supplied total tons / lote surface
    const rendimiento = selectedLote && selectedLote.superficie_ha > 0
      ? (form.produccion_tn! * 1000) / selectedLote.superficie_ha
      : 0

    const payload: CosechaPayload = {
      lote_id: form.lote_id!,
      cultivo_id: form.cultivo_id!,
      temporada,
      fecha_cosecha: dateToIso(form.fechaCosecha),
      rendimiento,
      humedad_pct: form.humedad_pct ?? undefined,
      observaciones: form.observaciones.trim() || undefined
    }

    setSaving(true)
    try {
      await onSave(payload, isEdit ? cosecha!.id : undefined)
      onHide()
    } catch {
      // Error toast is handled in the parent
    } finally {
      setSaving(false)
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        severity="secondary"
        outlined
        onClick={onHide}
        disabled={saving}
      />
      <Button
        label={isEdit ? 'Guardar cambios' : 'Registrar cosecha'}
        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        onClick={handleSave}
        disabled={saving}
        severity="success"
      />
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <span>
          <i className={`pi ${isEdit ? 'pi-pencil' : 'pi-plus-circle'} mr-2`} />
          {isEdit ? 'Editar cosecha' : 'Registrar nueva cosecha'}
        </span>
      }
      footer={footer}
      style={{ width: '680px' }}
      breakpoints={{ '768px': '95vw' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="p-fluid formgrid grid" style={{ rowGap: '1.25rem', paddingTop: '0.5rem' }}>

        {/* ── Row 1: Lote / Cultivo / Temporada ── */}
        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">
            Lote <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={form.lote_id}
            options={lotes}
            optionLabel="nombre"
            optionValue="id"
            placeholder="Seleccionar lote"
            onChange={(e) => set('lote_id', e.value)}
            className={errors.lote_id ? 'p-invalid' : ''}
            filter
            showClear
            emptyMessage="Sin lotes disponibles"
            itemTemplate={(option: Lote) => (
              <span>
                {option.nombre}
                <span className="text-500 text-sm ml-2">({option.superficie_ha} ha)</span>
              </span>
            )}
          />
          {errors.lote_id && (
            <small className="p-error block mt-1">{errors.lote_id}</small>
          )}
        </div>

        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">
            Cultivo <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={form.cultivo_id}
            options={cultivos}
            optionLabel="nombre"
            optionValue="id"
            placeholder="Seleccionar cultivo"
            onChange={(e) => set('cultivo_id', e.value)}
            className={errors.cultivo_id ? 'p-invalid' : ''}
            filter
            showClear
          />
          {errors.cultivo_id && (
            <small className="p-error block mt-1">{errors.cultivo_id}</small>
          )}
        </div>

        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">
            Temporada <span className="text-red-500">*</span>
          </label>
          <div className="flex align-items-center gap-2">
            <InputNumber
              value={form.temporadaA}
              onValueChange={(e) => set('temporadaA', e.value ?? null)}
              placeholder="Inicio"
              min={1900}
              max={2099}
              useGrouping={false}
              className={errors.temporada && !form.temporadaB ? 'p-invalid' : ''}
              style={{ flex: 1, minWidth: 0 }}
            />
            <span style={{ color: 'var(--text-color-secondary)', fontWeight: 600, flexShrink: 0 }}>/</span>
            <InputNumber
              value={form.temporadaB}
              onValueChange={(e) => set('temporadaB', e.value ?? null)}
              placeholder="Fin"
              min={1900}
              max={2099}
              useGrouping={false}
              className={errors.temporada && form.temporadaA ? 'p-invalid' : ''}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
          <small style={{ color: 'var(--text-color-secondary)', fontSize: '0.72rem' }}>
            Un año (ej. 2025) o rango (ej. 2024 / 2025). Fin es opcional.
          </small>
          {errors.temporada && (
            <small className="p-error block mt-1">{errors.temporada}</small>
          )}
        </div>

        {/* ── Row 2: Fecha / Producción total / Humedad ── */}
        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">Fecha de cosecha</label>
          <Calendar
            value={form.fechaCosecha}
            onChange={(e) => set('fechaCosecha', e.value as Date | null)}
            dateFormat="dd/mm/yy"
            placeholder="Opcional"
            showIcon
            showButtonBar
            maxDate={new Date()}
          />
        </div>

        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">
            Producción total <span className="text-red-500">*</span>
          </label>
          <InputNumber
            value={form.produccion_tn}
            onValueChange={(e: InputNumberValueChangeEvent) => set('produccion_tn', e.value ?? null)}
            suffix=" tn"
            min={0}
            maxFractionDigits={3}
            placeholder="0 tn"
            className={errors.produccion_tn ? 'p-invalid' : ''}
            locale="es-AR"
          />
          {errors.produccion_tn && (
            <small className="p-error block mt-1">{errors.produccion_tn}</small>
          )}
        </div>

        <div className="field col-12 md:col-4">
          <label className="font-semibold mb-1 block">Humedad</label>
          <InputNumber
            value={form.humedad_pct}
            onValueChange={(e: InputNumberValueChangeEvent) => set('humedad_pct', e.value ?? null)}
            suffix=" %"
            min={0}
            max={100}
            maxFractionDigits={1}
            placeholder="Opcional"
            locale="es-AR"
          />
        </div>

        {/* ── Row 3: Observaciones ── */}
        <div className="field col-12">
          <label className="font-semibold mb-1 block">Observaciones</label>
          <InputTextarea
            value={form.observaciones}
            onChange={(e) => set('observaciones', e.target.value)}
            rows={3}
            placeholder="Notas adicionales sobre esta cosecha (opcional)"
            autoResize
          />
        </div>

        {/* ── Yield estimate ── */}
        {rendimientoCalc && (
          <>
            <Divider className="col-12 my-0" />
            <div className="col-12">
              <Message
                severity="info"
                icon="pi pi-calculator"
                text={`Rendimiento calculado: ${rendimientoCalc} kg/ha  (${form.produccion_tn?.toLocaleString('es-AR')} tn / ${selectedLote!.superficie_ha} ha)`}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
