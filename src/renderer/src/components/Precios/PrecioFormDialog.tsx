import { useState, useEffect } from 'react'
import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Calendar } from 'primereact/calendar'
import type { Cultivo, PrecioPayload } from '../../types/domain'

export interface PrecioFormPayload {
  cultivo_id: number
  precio_ton: number
  fuente: string
  fecha_precio: string   // ISO YYYY-MM-DD
}

interface Props {
  visible: boolean
  cultivos: Cultivo[]
  onHide: () => void
  onSave: (payload: PrecioPayload) => Promise<void>
}

export default function PrecioFormDialog({ visible, cultivos, onHide, onSave }: Props) {
  const [cultivoId, setCultivoId] = useState<number | null>(null)
  const [precio, setPrecio] = useState<number | null>(null)
  const [fuente, setFuente] = useState('MATba-ROFEX')
  const [fecha, setFecha] = useState<Date>(new Date())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form on open
  useEffect(() => {
    if (visible) {
      setCultivoId(null)
      setPrecio(null)
      setFuente('MATba-ROFEX')
      setFecha(new Date())
      setErrors({})
    }
  }, [visible])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!cultivoId) e.cultivo = 'Seleccione un cultivo.'
    if (!precio || precio <= 0) e.precio = 'Ingrese un precio mayor a 0.'
    if (!fuente.trim()) e.fuente = 'Ingrese la fuente del precio.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return

    const isoDate = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

    setSaving(true)
    try {
      await onSave({
        cultivo_id: cultivoId!,
        precio_ton: precio!,
        fuente: fuente.trim(),
        fecha_precio: isoDate
      })
      onHide()
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Cancelar" icon="pi pi-times" text severity="secondary" onClick={onHide} disabled={saving} />
      <Button
        label={saving ? 'Guardando…' : 'Guardar'}
        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        severity="success"
        onClick={handleSave}
        disabled={saving}
      />
    </div>
  )

  return (
    <Dialog
      header="Registrar precio de mercado"
      visible={visible}
      onHide={onHide}
      footer={footer}
      style={{ width: '460px' }}
      modal
      draggable={false}
    >
      <div className="flex flex-column gap-4 pt-2">
        {/* Cultivo */}
        <div className="flex flex-column gap-1">
          <label className="font-semibold text-700">
            Cultivo <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={cultivoId}
            options={cultivos}
            optionLabel="nombre"
            optionValue="id"
            onChange={(e) => setCultivoId(e.value)}
            placeholder="Seleccionar cultivo…"
            className={errors.cultivo ? 'p-invalid' : ''}
          />
          {errors.cultivo && <small className="p-error">{errors.cultivo}</small>}
        </div>

        {/* Price */}
        <div className="flex flex-column gap-1">
          <label className="font-semibold text-700">
            Precio (ARS / tn) <span className="text-red-500">*</span>
          </label>
          <InputNumber
            value={precio}
            onValueChange={(e) => setPrecio(e.value ?? null)}
            mode="decimal"
            locale="es-AR"
            minFractionDigits={0}
            maxFractionDigits={2}
            min={0}
            placeholder="Ej: 450000"
            className={errors.precio ? 'p-invalid w-full' : 'w-full'}
          />
          {errors.precio && <small className="p-error">{errors.precio}</small>}
        </div>

        {/* Date */}
        <div className="flex flex-column gap-1">
          <label className="font-semibold text-700">
            Fecha de cotización <span className="text-red-500">*</span>
          </label>
          <Calendar
            value={fecha}
            onChange={(e) => e.value instanceof Date && setFecha(e.value)}
            dateFormat="dd/mm/yy"
            maxDate={new Date()}
            showIcon
            placeholder="Seleccionar fecha…"
            className="w-full"
          />
        </div>

        {/* Source */}
        <div className="flex flex-column gap-1">
          <label className="font-semibold text-700">
            Fuente <span className="text-red-500">*</span>
          </label>
          <InputText
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            placeholder="Ej: MATba-ROFEX, Bolsa Rosario, manual…"
            className={errors.fuente ? 'p-invalid' : ''}
          />
          {errors.fuente && <small className="p-error">{errors.fuente}</small>}
        </div>
      </div>
    </Dialog>
  )
}
