/**
 * Typed wrappers around window.api (the contextBridge-exposed IPC bridge).
 * Import from this file inside React components — never call window.api directly.
 */

export const cultivosService = {
  getAll: () => window.api.cultivosGetAll(),
  create: (nombre: string) => window.api.cultivosCreate(nombre),
  delete: (id: number) => window.api.cultivosDelete(id)
}

export const lotesService = {
  getAll: () => window.api.lotesGetAll(),
  create: (payload: { nombre: string; ubicacion?: string; superficie_ha: number }) =>
    window.api.lotesCreate(payload),
  update: (id: number, payload: Parameters<typeof window.api.lotesUpdate>[1]) =>
    window.api.lotesUpdate(id, payload),
  delete: (id: number) => window.api.lotesDelete(id)
}

export const cosechasService = {
  getAll: () => window.api.cosechasGetAll(),
  getById: (id: number) => window.api.cosechasGetById(id),
  create: (payload: Parameters<typeof window.api.cosechasCreate>[0]) =>
    window.api.cosechasCreate(payload),
  update: (id: number, payload: Parameters<typeof window.api.cosechasUpdate>[1]) =>
    window.api.cosechasUpdate(id, payload),
  delete: (id: number) => window.api.cosechasDelete(id)
}

export const preciosService = {
  getAll: () => window.api.preciosGetAll(),
  getLatest: () => window.api.preciosGetLatest(),
  upsert: (payload: Parameters<typeof window.api.preciosUpsert>[0]) =>
    window.api.preciosUpsert(payload)
}
