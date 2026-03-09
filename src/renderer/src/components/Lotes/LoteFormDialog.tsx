import { useState, useEffect, useCallback } from 'react'
import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { InputNumber, type InputNumberValueChangeEvent } from 'primereact/inputnumber'
import { Dropdown } from 'primereact/dropdown'
import type { Lote } from '../../types/domain'
import {
  DEPARTMENT_NAMES,
  LOCATIONS_BY_DEPARTMENT,
  buildUbicacion,
  parseUbicacion
} from '../../data/cordoba-locations'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LotePayload {
  nombre: string
  ubicacion?: string
  superficie_ha: number
}

interface FormState {
  nombre: string
  departamento: string
  localidad: string
  superficie_ha: number | null
}

interface FormErrors {
  nombre?: string
  superficie_ha?: string
}

interface Props {
  visible: boolean
  onHide: () => void
  /** Parent handles IPC + toast. Throws on error so dialog stays open. */
  onSave: (payload: LotePayload, editId?: number) => Promise<void>
  /** When set the dialog is in edit mode */
  lote?: Lote | null
}

// ── Component ─────────────────────────────────────────────────────────────────

const emptyForm = (): FormState => ({
  nombre: '',
  departamento: '',
  localidad: '',
  superficie_ha: null
})

export default function LoteFormDialog({ visible, onHide, onSave, lote }: Props) {
  const isEdit = lote != null

  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (isEdit && lote) {
      const parsed = parseUbicacion(lote.ubicacion)
      setForm({
        nombre: lote.nombre,
        departamento: parsed?.departamento ?? '',
        localidad: parsed?.localidad ?? '',
        superficie_ha: lote.superficie_ha
      })
    } else {
      setForm(emptyForm())
    }
    setErrors({})
  }, [visible, lote, isEdit])

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre del lote es obligatorio.'
    if (form.superficie_ha === null || form.superficie_ha <= 0)
      e.superficie_ha = 'Ingrese una superficie mayor a 0.'
    return e
  }, [form])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }

    const payload: LotePayload = {
      nombre: form.nombre.trim(),
      ubicacion:
        form.departamento && form.localidad
          ? buildUbicacion(form.departamento, form.localidad)
          : form.departamento || undefined,
      superficie_ha: form.superficie_ha!
    }

    setSaving(true)
    try {
      await onSave(payload, isEdit ? lote!.id : undefined)
      onHide()
    } catch {
      // Error toast handled by parent
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
        label={isEdit ? 'Guardar cambios' : 'Agregar lote'}
        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        severity="success"
        onClick={handleSave}
        disabled={saving}
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
          {isEdit ? 'Editar lote' : 'Agregar nuevo lote'}
        </span>
      }
      footer={footer}
      style={{ width: '540px' }}
      breakpoints={{ '640px': '95vw' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="p-fluid formgrid grid" style={{ rowGap: '1.25rem', paddingTop: '0.5rem' }}>

        {/* Nombre */}
        <div className="field col-12">
          <label className="font-semibold mb-1 block">
            Nombre <span className="text-red-500">*</span>
          </label>
          <InputText
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="ej. Lote Norte, Campo La Esperanza"
            className={errors.nombre ? 'p-invalid' : ''}
            maxLength={120}
            autoFocus
          />
          {errors.nombre && <small className="p-error block mt-1">{errors.nombre}</small>}
        </div>

        {/* Superficie */}
        <div className="field col-12 md:col-5">
          <label className="font-semibold mb-1 block">
            Superficie <span className="text-red-500">*</span>
          </label>
          <InputNumber
            value={form.superficie_ha}
            onValueChange={(e: InputNumberValueChangeEvent) =>
              set('superficie_ha', e.value ?? null)
            }
            suffix=" ha"
            min={0.01}
            maxFractionDigits={2}
            placeholder="0.00 ha"
            className={errors.superficie_ha ? 'p-invalid' : ''}
            locale="es-AR"
          />
          {errors.superficie_ha && (
            <small className="p-error block mt-1">{errors.superficie_ha}</small>
          )}
        </div>

        {/* Ubicación — Departamento */}
        <div className="field col-12 md:col-6">
          <label className="font-semibold mb-1 block">Departamento</label>
          <Dropdown
            value={form.departamento || null}
            options={DEPARTMENT_NAMES}
            onChange={(e) => {
              // Reset localidad when department changes
              setForm((prev) => ({ ...prev, departamento: e.value ?? '', localidad: '' }))
            }}
            placeholder="Seleccionar departamento"
            filter
            filterPlaceholder="Buscar..."
            showClear
            style={{ width: '100%' }}
          />
        </div>

        {/* Ubicación — Localidad */}
        <div className="field col-12 md:col-6">
          <label className="font-semibold mb-1 block">Localidad</label>
          <Dropdown
            value={form.localidad || null}
            options={form.departamento ? LOCATIONS_BY_DEPARTMENT[form.departamento] ?? [] : []}
            onChange={(e) => set('localidad', e.value ?? '')}
            placeholder={form.departamento ? 'Seleccionar localidad' : 'Primero elegí un departamento'}
            disabled={!form.departamento}
            filter={
              !!form.departamento &&
              (LOCATIONS_BY_DEPARTMENT[form.departamento]?.length ?? 0) > 5
            }
            filterPlaceholder="Buscar..."
            showClear
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Dialog>
  )
}
