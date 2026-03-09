import { ElectronAPI } from '@electron-toolkit/preload'

export interface AppAPI {
  // Cultivos
  cultivosGetAll: () => Promise<Cultivo[]>
  cultivosCreate: (nombre: string) => Promise<Cultivo>
  cultivosDelete: (id: number) => Promise<{ success: boolean }>

  // Lotes
  lotesGetAll: () => Promise<Lote[]>
  lotesCreate: (payload: { nombre: string; ubicacion?: string; superficie_ha: number }) => Promise<Lote>
  lotesUpdate: (id: number, payload: Partial<Lote>) => Promise<Lote>
  lotesDelete: (id: number) => Promise<{ success: boolean }>

  // Cosechas
  cosechasGetAll: () => Promise<CosechaRow[]>
  cosechasGetById: (id: number) => Promise<CosechaRow | undefined>
  cosechasCreate: (payload: CosechaPayload) => Promise<CosechaRow>
  cosechasUpdate: (id: number, payload: Partial<CosechaPayload>) => Promise<CosechaRow>
  cosechasDelete: (id: number) => Promise<{ success: boolean }>

  // Precios
  preciosGetAll: () => Promise<PrecioCacheRow[]>
  preciosGetLatest: () => Promise<PrecioCacheRow[]>
  preciosUpsert: (payload: PrecioPayload) => Promise<PrecioCacheRow>
}

// ── Domain types ──────────────────────────────────────────────────────────────

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
  fecha_cosecha?: string
  rendimiento: number
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
