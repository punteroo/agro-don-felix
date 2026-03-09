/**
 * SQL schema definitions for the application database.
 * All CREATE TABLE statements use IF NOT EXISTS so they are safe to run on every startup.
 */

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS cultivos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT    NOT NULL UNIQUE   -- e.g. "Soja", "Maíz", "Trigo"
  );

  CREATE TABLE IF NOT EXISTS lotes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT    NOT NULL,
    ubicacion     TEXT,
    superficie_ha REAL    NOT NULL CHECK (superficie_ha > 0)
  );

  CREATE TABLE IF NOT EXISTS cosechas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lote_id         INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    cultivo_id      INTEGER NOT NULL REFERENCES cultivos(id),
    temporada       TEXT    NOT NULL,          -- e.g. "2024/2025"
    fecha_cosecha   TEXT,                      -- ISO-8601 date string
    rendimiento     REAL    NOT NULL CHECK (rendimiento >= 0),  -- kg / ha
    humedad_pct     REAL    CHECK (humedad_pct >= 0 AND humedad_pct <= 100),
    observaciones   TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS precios_cache (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cultivo_id    INTEGER NOT NULL REFERENCES cultivos(id),
    precio_ton    REAL    NOT NULL,            -- ARS per ton
    moneda        TEXT    NOT NULL DEFAULT 'ARS',
    fuente        TEXT    NOT NULL DEFAULT 'MATba-ROFEX',
    fecha_precio  TEXT    NOT NULL,            -- date of the price quote
    fetched_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (cultivo_id, fecha_precio)
  );
`

/** Seed the cultivos table with the most common Argentine crops. */
export const SEED_CULTIVOS_SQL = `
  INSERT OR IGNORE INTO cultivos (nombre) VALUES
    ('Soja'),
    ('Maíz'),
    ('Trigo'),
    ('Girasol'),
    ('Sorgo'),
    ('Cebada');
`
