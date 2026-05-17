import type Database from 'better-sqlite3'

/**
 * Seeds the database with realistic development data for Agro Don Félix.
 * Only runs when the lotes table is empty, so it is safe to call on every startup.
 *
 * Data profile:
 *   - 5 lotes in Departamento Unión, Córdoba (Bell Ville, Justiniano Posse, Canals, Noetinger, Morrison)
 *   - Crops: Soja, Maíz (summer campaign 2024/2025), Trigo (winter campaign 2024)
 *   - Emergent data: 2025 winter Trigo implantation in progress (produccion_tn = 0)
 *   - Monthly MATba-ROFEX price snapshots: January–May 2025
 *
 * Input model: total production in tons is the primary value; rendimiento (kg/ha) is always
 * derived as produccion_tn * 1000 / superficie_ha, matching exactly how the UI works.
 */
export function seedDevData(db: Database.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM lotes').get() as { n: number }
  if (n > 0) return

  const insertLote = db.prepare(
    'INSERT INTO lotes (nombre, ubicacion, superficie_ha) VALUES (?, ?, ?)'
  )

  const insertCosecha = db.prepare(
    `INSERT INTO cosechas
       (lote_id, cultivo_id, temporada, fecha_cosecha, rendimiento, humedad_pct, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const insertPrecio = db.prepare(
    `INSERT OR IGNORE INTO precios_cache
       (cultivo_id, precio_ton, moneda, fuente, fecha_precio)
     VALUES (?, ?, 'ARS', 'MATba-ROFEX', ?)`
  )

  const cultivoId = (nombre: string): number =>
    (db.prepare('SELECT id FROM cultivos WHERE nombre = ?').get(nombre) as { id: number }).id

  const soja  = cultivoId('Soja')
  const maiz  = cultivoId('Maíz')
  const trigo = cultivoId('Trigo')

  /** Derives rendimiento (kg/ha) from total production and lote surface area. */
  function rend(produccionTn: number, superficieHa: number): number {
    return (produccionTn * 1000) / superficieHa
  }

  db.transaction(() => {
    // ── Lotes ──────────────────────────────────────────────────────────────
    const l1 = Number(insertLote.run('LOTE "SAN PABLO"',    'Bell Ville, Unión',       120.0).lastInsertRowid)
    const l2 = Number(insertLote.run('LOTE "LA ESPERANZA"', 'Justiniano Posse, Unión',  85.0).lastInsertRowid)
    const l3 = Number(insertLote.run('LOTE RN 9 NORTE',     'Canals, Unión',           200.0).lastInsertRowid)
    const l4 = Number(insertLote.run('LOTE "EL PORVENIR"',  'Noetinger, Unión',         65.0).lastInsertRowid)
    const l5 = Number(insertLote.run('LOTE "LOS ROBLES"',   'Morrison, Unión',         150.0).lastInsertRowid)

    // ── Cosechas 2024/2025 — verano (Soja + Maíz) ─────────────────────────
    // Soja: lotes 1, 2, 3, 5 — cosecha marzo/abril 2025
    insertCosecha.run(l1, soja, '2024/2025', '2025-03-28', rend(390,    120), 13.5, null)
    insertCosecha.run(l2, soja, '2024/2025', '2025-04-05', rend(263.5,   85), 14.0, null)
    insertCosecha.run(l3, soja, '2024/2025', '2025-03-18', rend(696,    200), 12.8, null)
    insertCosecha.run(l5, soja, '2024/2025', '2025-04-02', rend(498,    150), 13.5, null)

    // Maíz: lotes 1, 3, 4 — cosecha febrero/marzo 2025
    insertCosecha.run(l1, maiz, '2024/2025', '2025-02-20', rend(1344,   120), 15.2, null)
    insertCosecha.run(l3, maiz, '2024/2025', '2025-02-14', rend(2420,   200), 14.5, null)
    insertCosecha.run(l4, maiz, '2024/2025', '2025-03-05', rend(702,     65), 16.0, null)

    // ── Cosechas 2024 — invierno (Trigo) ───────────────────────────────────
    // Trigo: lotes 2, 4, 5 — cosecha noviembre 2024
    insertCosecha.run(l2, trigo, '2024', '2024-11-12', rend(323,    85), 11.5, null)
    insertCosecha.run(l4, trigo, '2024', '2024-11-08', rend(234,    65), 12.0, null)
    insertCosecha.run(l5, trigo, '2024', '2024-11-20', rend(607.5, 150), 11.0, null)

    // ── Cosechas 2025 — campaña fina en curso (implantación) ───────────────
    // Trigo sembrado mayo/junio 2025, cosecha estimada noviembre 2025.
    // produccion_tn = 0 signals an in-progress implantation (no harvest yet).
    const obsEnCurso = 'Implantación en curso — cosecha estimada noviembre 2025'
    insertCosecha.run(l2, trigo, '2025', null, 0, null, obsEnCurso)
    insertCosecha.run(l4, trigo, '2025', null, 0, null, obsEnCurso)
    insertCosecha.run(l5, trigo, '2025', null, 0, null, obsEnCurso)

    // ── Precios MATba-ROFEX — snapshots mensuales enero–mayo 2025 ──────────
    // Soja (ARS/tn)
    insertPrecio.run(soja,  255000, '2025-01-10')
    insertPrecio.run(soja,  261000, '2025-02-07')
    insertPrecio.run(soja,  268500, '2025-03-07')
    insertPrecio.run(soja,  275000, '2025-04-04')
    insertPrecio.run(soja,  282000, '2025-05-02')

    // Maíz (ARS/tn)
    insertPrecio.run(maiz,  170000, '2025-01-10')
    insertPrecio.run(maiz,  174500, '2025-02-07')
    insertPrecio.run(maiz,  178000, '2025-03-07')
    insertPrecio.run(maiz,  183500, '2025-04-04')
    insertPrecio.run(maiz,  188000, '2025-05-02')

    // Trigo (ARS/tn)
    insertPrecio.run(trigo, 218000, '2025-01-10')
    insertPrecio.run(trigo, 223000, '2025-02-07')
    insertPrecio.run(trigo, 229500, '2025-03-07')
    insertPrecio.run(trigo, 235000, '2025-04-04')
    insertPrecio.run(trigo, 241000, '2025-05-02')
  })()
}
