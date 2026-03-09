import { ipcMain } from 'electron'
import { getDb } from '../database/db'

export function registerCosechasHandlers(): void {
  const db = getDb()

  // ── READ ──────────────────────────────────────────────────────────────────
  ipcMain.handle('cosechas:getAll', () => {
    return db
      .prepare(
        `SELECT c.*, l.nombre AS lote_nombre, l.superficie_ha,
                cu.nombre AS cultivo_nombre
         FROM   cosechas c
         JOIN   lotes    l  ON l.id  = c.lote_id
         JOIN   cultivos cu ON cu.id = c.cultivo_id
         ORDER  BY c.fecha_cosecha DESC`
      )
      .all()
  })

  ipcMain.handle('cosechas:getById', (_e, id: number) => {
    return db
      .prepare(
        `SELECT c.*, l.nombre AS lote_nombre, l.superficie_ha,
                cu.nombre AS cultivo_nombre
         FROM   cosechas c
         JOIN   lotes    l  ON l.id  = c.lote_id
         JOIN   cultivos cu ON cu.id = c.cultivo_id
         WHERE  c.id = ?`
      )
      .get(id)
  })

  // ── CREATE ────────────────────────────────────────────────────────────────
  ipcMain.handle(
    'cosechas:create',
    (
      _e,
      payload: {
        lote_id: number
        cultivo_id: number
        temporada: string
        fecha_cosecha?: string
        rendimiento: number
        humedad_pct?: number
        observaciones?: string
      }
    ) => {
      const stmt = db.prepare(
        `INSERT INTO cosechas
           (lote_id, cultivo_id, temporada, fecha_cosecha, rendimiento, humedad_pct, observaciones)
         VALUES
           (@lote_id, @cultivo_id, @temporada, @fecha_cosecha, @rendimiento, @humedad_pct, @observaciones)
         RETURNING *`
      )
      return stmt.get(payload)
    }
  )

  // ── UPDATE ────────────────────────────────────────────────────────────────
  ipcMain.handle(
    'cosechas:update',
    (
      _e,
      id: number,
      payload: {
        lote_id?: number
        cultivo_id?: number
        temporada?: string
        fecha_cosecha?: string
        rendimiento?: number
        humedad_pct?: number
        observaciones?: string
      }
    ) => {
      const current = db.prepare('SELECT * FROM cosechas WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined
      if (!current) throw new Error(`Cosecha con id ${id} no encontrada`)
      const merged = { ...current, ...payload }
      const stmt = db.prepare(
        `UPDATE cosechas SET
           lote_id = @lote_id, cultivo_id = @cultivo_id, temporada = @temporada,
           fecha_cosecha = @fecha_cosecha, rendimiento = @rendimiento,
           humedad_pct = @humedad_pct, observaciones = @observaciones
         WHERE id = @id
         RETURNING *`
      )
      return stmt.get({ ...merged, id })
    }
  )

  // ── DELETE ────────────────────────────────────────────────────────────────
  ipcMain.handle('cosechas:delete', (_e, id: number) => {
    db.prepare('DELETE FROM cosechas WHERE id = ?').run(id)
    return { success: true }
  })
}
