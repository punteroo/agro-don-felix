import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Typed IPC bridge exposed to the renderer process.
const api = {
  // ── Cultivos ────────────────────────────────────────────────────────────
  cultivosGetAll: () => ipcRenderer.invoke('cultivos:getAll'),
  cultivosCreate: (nombre: string) => ipcRenderer.invoke('cultivos:create', nombre),
  cultivosDelete: (id: number) => ipcRenderer.invoke('cultivos:delete', id),

  // ── Lotes ───────────────────────────────────────────────────────────────
  lotesGetAll: () => ipcRenderer.invoke('lotes:getAll'),
  lotesCreate: (payload: { nombre: string; ubicacion?: string; superficie_ha: number }) =>
    ipcRenderer.invoke('lotes:create', payload),
  lotesUpdate: (id: number, payload: Partial<{ nombre: string; ubicacion: string; superficie_ha: number }>) =>
    ipcRenderer.invoke('lotes:update', id, payload),
  lotesDelete: (id: number) => ipcRenderer.invoke('lotes:delete', id),

  // ── Cosechas ────────────────────────────────────────────────────────────
  cosechasGetAll: () => ipcRenderer.invoke('cosechas:getAll'),
  cosechasGetById: (id: number) => ipcRenderer.invoke('cosechas:getById', id),
  cosechasCreate: (payload: {
    lote_id: number
    cultivo_id: number
    temporada: string
    fecha_cosecha?: string
    rendimiento: number
    humedad_pct?: number
    observaciones?: string
  }) => ipcRenderer.invoke('cosechas:create', payload),
  cosechasUpdate: (id: number, payload: object) => ipcRenderer.invoke('cosechas:update', id, payload),
  cosechasDelete: (id: number) => ipcRenderer.invoke('cosechas:delete', id),

  // ── Precios ─────────────────────────────────────────────────────────────
  preciosGetAll: () => ipcRenderer.invoke('precios:getAll'),
  preciosGetLatest: () => ipcRenderer.invoke('precios:getLatest'),
  preciosUpsert: (payload: {
    cultivo_id: number
    precio_ton: number
    moneda?: string
    fuente?: string
    fecha_precio: string
  }) => ipcRenderer.invoke('precios:upsert', payload),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
