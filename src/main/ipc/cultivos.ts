import { ipcMain } from 'electron'
import { getDb } from '../database/db'

export function registerCultivosHandlers(): void {
  const db = getDb()

  ipcMain.handle('cultivos:getAll', () => {
    return db.prepare('SELECT * FROM cultivos ORDER BY nombre ASC').all()
  })

  ipcMain.handle('cultivos:create', (_e, nombre: string) => {
    return db
      .prepare('INSERT INTO cultivos (nombre) VALUES (?) RETURNING *')
      .get(nombre)
  })

  ipcMain.handle('cultivos:delete', (_e, id: number) => {
    db.prepare('DELETE FROM cultivos WHERE id = ?').run(id)
    return { success: true }
  })
}
