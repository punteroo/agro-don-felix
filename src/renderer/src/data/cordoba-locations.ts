/**
 * Productive departments of Córdoba, Argentina and their towns.
 * Source: IDECOR agricultural coverage map (soja/maíz areas) + official
 * provincial administrative data.
 *
 * Departments are sorted alphabetically.
 * Towns within each department are also sorted alphabetically.
 */

export interface DepartmentEntry {
  /** Official department name as used in Argentine administrative databases */
  nombre: string
  localidades: string[]
}

/** All productive departments with their localities, sorted alphabetically */
export const CORDOBA_DEPARTMENTS: DepartmentEntry[] = [
  {
    nombre: 'Calamuchita',
    localidades: [
      'Almafuerte',
      'Amboy',
      'Embalse',
      'La Cruz',
      'La Cumbrecita',
      'Los Molinos',
      'Los Reartes',
      'San Agustín (Calamuchita)',
      'Santa Rosa de Calamuchita',
      'Villa del Dique',
      'Villa General Belgrano',
      'Villa Rumipal',
      'Yacanto de Calamuchita'
    ]
  },
  {
    nombre: 'Capital',
    localidades: ['Córdoba']
  },
  {
    nombre: 'Colón',
    localidades: [
      'Agua de Oro',
      'Colonia Caroya',
      'Jesús María',
      'La Calera',
      'La Granja',
      'Malagueño',
      'Mendiolaza',
      'Pajas Blancas',
      'Río Ceballos',
      'Saldán',
      'Salsipuedes',
      'Unquillo',
      'Villa Allende'
    ]
  },
  {
    nombre: 'Cruz del Eje',
    localidades: [
      'Cruz del Eje',
      'El Brete',
      'Guanaco Muerto',
      'La Higuera',
      'Los Chañaritos',
      'Paso Viejo',
      'Pichanas',
      'Serrezuela',
      'Villa de Soto'
    ]
  },
  {
    nombre: 'General Roca',
    localidades: [
      'Bengolea',
      'Chucul',
      'El Rastreador',
      'General Deheza',
      'Huanchilla',
      'La Carlota',
      'Las Acequias',
      'Los Cisnes',
      'Olaeta',
      'Tosquita',
      'Ucacha',
      'Villa Huidobro'
    ]
  },
  {
    nombre: 'Gral. San Martín',
    localidades: [
      'Campaña',
      'James Craik',
      'Las Playas',
      'Los Zorros',
      'Ordóñez',
      'Saira',
      'Tío Pujio',
      'Villa María',
      'Villa Nueva'
    ]
  },
  {
    nombre: 'Ischilín',
    localidades: ['Caminiaga', 'Chuñaguasi', 'Deán Funes', 'El Manzano', 'Los Pozos', 'Quilino']
  },
  {
    nombre: 'Juárez Celman',
    localidades: ['Alcira Gigena', 'Bulnes', 'Charras', 'La Cautiva', 'Reducción']
  },
  {
    nombre: 'Marcos Juárez',
    localidades: [
      'Arias',
      'Camilo Aldao',
      'Cavanagh',
      'Corral de Bustos',
      'Cruz Alta',
      'General Baldissera',
      'Inriville',
      'Leones',
      'Marcos Juárez',
      'Monte Buey'
    ]
  },
  {
    nombre: 'Pocho',
    localidades: ['Chancaní', 'La Patria', 'La Ramada', 'Salsacate', 'Taninga', 'Villa de Pocho']
  },
  {
    nombre: 'Pte. Roque Sáenz Peña',
    localidades: [
      'Buchardo',
      'Huinca Renancó',
      'Italó',
      'Laboulaye',
      'Mattaldi',
      'Villa Huidobro',
      'Villa Valeria'
    ]
  },
  {
    nombre: 'Punilla',
    localidades: [
      'Bialet Massé',
      'Capilla del Monte',
      'Cosquín',
      'Huerta Grande',
      'La Cumbre',
      'La Falda',
      'Los Cocos',
      'Santa María de Punilla',
      'Valle Hermoso',
      'Villa Carlos Paz',
      'Villa Giardino'
    ]
  },
  {
    nombre: 'Río Cuarto',
    localidades: [
      'Achiras',
      'Adelia María',
      'Berrotarán',
      'Carnerillo',
      'Coronel Baigorria',
      'Coronel Moldes',
      'Elena',
      'Holmberg',
      'Las Higueras',
      'Rio de Los Sauces',
      'Río Cuarto',
      'Sampacho',
      'Suco'
    ]
  },
  {
    nombre: 'Río Primero',
    localidades: [
      'Capilla de los Remedios',
      'Colonia Tirolesa',
      'La Para',
      'Monte Cristo',
      'Obispo Trejo',
      'Río Primero',
      'Santa Rosa de Río Primero'
    ]
  },
  {
    nombre: 'Río Seco',
    localidades: ['Sebastián Elcano', 'Villa de María del Río Seco']
  },
  {
    nombre: 'Río Segundo',
    localidades: ['Laguna Larga', 'Oliva', 'Oncativo', 'Pilar', 'Río Segundo', 'Villa del Rosario']
  },
  {
    nombre: 'San Alberto',
    localidades: [
      'Mina Clavero',
      'Nono',
      'San Pedro (San Alberto)',
      'Villa Cura Brochero',
      'Villa Dolores'
    ]
  },
  {
    nombre: 'San Javier',
    localidades: ['La Paz', 'San Javier y Yacanto', 'Villa de Las Rosas', 'Villa Dolores']
  },
  {
    nombre: 'San Justo',
    localidades: [
      'Arroyito',
      'Brinkmann',
      'Devoto',
      'Freyre',
      'Frontera',
      'Las Varillas',
      'Morteros',
      'Porteña',
      'San Francisco',
      'Saturnino María Laspiur'
    ]
  },
  {
    nombre: 'Santa María',
    localidades: [
      'Alta Gracia',
      'Anisacate',
      'La Bolsa',
      'La Serranita',
      'Los Aromos',
      'Potrero de Garay',
      'San José (Santa María)',
      'Villa del Prado'
    ]
  },
  {
    nombre: 'Sobremonte',
    localidades: ['San Francisco del Chañar']
  },
  {
    nombre: 'Tercero Arriba',
    localidades: [
      'Almafuerte',
      'Corralito',
      'Hernando',
      'La Isla',
      'Las Perdices',
      'Oliva',
      'Punta del Agua',
      'Río Tercero',
      'Villa Ascasubi'
    ]
  },
  {
    nombre: 'Totoral',
    localidades: ['Cañada de Río Pinto', 'Las Peñas', 'Villa del Totoral']
  },
  {
    nombre: 'Tulumba',
    localidades: ['San José de la Dormida', 'Villa Tulumba']
  },
  {
    nombre: 'Unión',
    localidades: [
      'Justiniano Posse',
      'Bell Ville',
      'Benjamín Gould',
      'Canals',
      'Las Varas',
      'Morrison',
      'Noetinger',
      'Viamonte',
      'Villa San Esteban'
    ]
  }
]

/** Quick lookup map: department name → sorted array of town names */
export const LOCATIONS_BY_DEPARTMENT: Record<string, string[]> = Object.fromEntries(
  CORDOBA_DEPARTMENTS.map((d) => [d.nombre, d.localidades])
)

/** Flat list of all department names (for the first Dropdown) */
export const DEPARTMENT_NAMES: string[] = CORDOBA_DEPARTMENTS.map((d) => d.nombre)

/**
 * Parse a combined "Localidad, Departamento" string back into its two parts.
 * Returns null if the string cannot be parsed against known data.
 */
export function parseUbicacion(
  ubicacion: string | undefined | null
): { departamento: string; localidad: string } | null {
  if (!ubicacion) return null
  const idx = ubicacion.lastIndexOf(', ')
  if (idx === -1) return null
  const localidad = ubicacion.slice(0, idx).trim()
  const departamento = ubicacion.slice(idx + 2).trim()
  if (!DEPARTMENT_NAMES.includes(departamento)) return null
  return { departamento, localidad }
}

/**
 * Build the stored ubicacion string from its two parts.
 * Format: "Localidad, Departamento"
 */
export function buildUbicacion(departamento: string, localidad: string): string {
  return `${localidad}, ${departamento}`
}
