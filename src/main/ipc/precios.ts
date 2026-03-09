import { ipcMain } from 'electron'
import { getDb } from '../database/db'

export function registerPreciosHandlers(): void {
  const db = getDb()

  /** Return all cached price entries, most recent first */
  ipcMain.handle('precios:getAll', () => {
    return db
      .prepare(
        `SELECT p.*, c.nombre AS cultivo_nombre
         FROM   precios_cache p
         JOIN   cultivos c ON c.id = p.cultivo_id
         ORDER  BY p.fecha_precio DESC`
      )
      .all()
  })

  /** Return only the latest price per crop (for the dashboard summary) */
  ipcMain.handle('precios:getLatest', () => {
    return db
      .prepare(
        `SELECT p.*, c.nombre AS cultivo_nombre
         FROM   precios_cache p
         JOIN   cultivos c ON c.id = p.cultivo_id
         WHERE  p.fetched_at = (
           SELECT MAX(p2.fetched_at) FROM precios_cache p2 WHERE p2.cultivo_id = p.cultivo_id
         )
         ORDER  BY c.nombre ASC`
      )
      .all()
  })

  /**
   * Upsert a price entry. Called after fetching from external API (MATba-ROFEX).
   * The renderer fetches the remote data (it has network access in Electron) and
   * passes the result here to persist it.
   */
  ipcMain.handle(
    'precios:upsert',
    (
      _e,
      payload: {
        cultivo_id: number
        precio_ton: number
        moneda?: string
        fuente?: string
        fecha_precio: string
      }
    ) => {
      return db
        .prepare(
          `INSERT INTO precios_cache (cultivo_id, precio_ton, moneda, fuente, fecha_precio)
           VALUES (@cultivo_id, @precio_ton, @moneda, @fuente, @fecha_precio)
           ON CONFLICT (cultivo_id, fecha_precio)
             DO UPDATE SET precio_ton = excluded.precio_ton, fetched_at = datetime('now')
           RETURNING *`
        )
        .get({
          moneda: 'ARS',
          fuente: 'MATba-ROFEX',
          ...payload
        })
    }
  )
}
