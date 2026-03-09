import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { CREATE_TABLES_SQL, SEED_CULTIVOS_SQL } from './schema'

let _db: Database.Database | null = null

/**
 * Returns the singleton SQLite database instance.
 * The database file is stored in the Electron userData directory so it
 * survives app updates and is writable on Windows without admin rights.
 */
export function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = join(app.getPath('userData'), 'agrodonfelix.db')
  _db = new Database(dbPath)

  // Run schema creation (idempotent)
  _db.exec(CREATE_TABLES_SQL)
  _db.exec(SEED_CULTIVOS_SQL)

  return _db
}

/** Gracefully close the connection (call on app 'will-quit'). */
export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
