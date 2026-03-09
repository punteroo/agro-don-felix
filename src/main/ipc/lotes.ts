import { ipcMain } from 'electron'
import { getDb } from '../database/db'

export function registerLotesHandlers(): void {
  const db = getDb()

  ipcMain.handle('lotes:getAll', () => {
    return db.prepare('SELECT * FROM lotes ORDER BY nombre ASC').all()
  })

  ipcMain.handle(
    'lotes:create',
    (
      _e,
      payload: { nombre: string; ubicacion?: string; superficie_ha: number }
    ) => {
      return db
        .prepare(
          `INSERT INTO lotes (nombre, ubicacion, superficie_ha)
           VALUES (@nombre, @ubicacion, @superficie_ha)
           RETURNING *`
        )
        .get(payload)
    }
  )

  ipcMain.handle(
    'lotes:update',
    (
      _e,
      id: number,
      payload: { nombre?: string; ubicacion?: string; superficie_ha?: number }
    ) => {
      const current = db.prepare('SELECT * FROM lotes WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined
      if (!current) throw new Error(`Lote con id ${id} no encontrado`)
      const merged = { ...current, ...payload }
      return db
        .prepare(
          `UPDATE lotes SET nombre = @nombre, ubicacion = @ubicacion, superficie_ha = @superficie_ha
           WHERE id = @id RETURNING *`
        )
        .get({ ...merged, id })
    }
  )

  ipcMain.handle('lotes:delete', (_e, id: number) => {
    db.prepare('DELETE FROM lotes WHERE id = ?').run(id)
    return { success: true }
  })
}
