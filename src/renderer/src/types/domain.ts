/**
 * Shared domain types for the renderer process.
 * Keep these in sync with src/preload/index.d.ts — they are intentionally
 * separate so the renderer never imports from the Electron-only preload entry.
 */

export interface Cultivo {
  id: number
  nombre: string
}

export interface Lote {
  id: number
  nombre: string
  ubicacion?: string
  superficie_ha: number
}

export interface CosechaPayload {
  lote_id: number
  cultivo_id: number
  temporada: string
  fecha_cosecha?: string   // ISO-8601 YYYY-MM-DD
  rendimiento: number      // kg / ha
  humedad_pct?: number
  observaciones?: string
}

export interface CosechaRow extends CosechaPayload {
  id: number
  created_at: string
  lote_nombre: string
  cultivo_nombre: string
  superficie_ha: number
}

export interface PrecioPayload {
  cultivo_id: number
  precio_ton: number
  moneda?: string
  fuente?: string
  fecha_precio: string
}

export interface PrecioCacheRow extends PrecioPayload {
  id: number
  moneda: string
  fuente: string
  fetched_at: string
  cultivo_nombre: string
}
