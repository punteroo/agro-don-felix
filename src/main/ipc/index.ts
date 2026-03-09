import { registerCosechasHandlers } from './cosechas'
import { registerCultivosHandlers } from './cultivos'
import { registerLotesHandlers } from './lotes'
import { registerPreciosHandlers } from './precios'

/** Register all IPC handlers. Call once after app is ready. */
export function registerAllHandlers(): void {
  registerCultivosHandlers()
  registerLotesHandlers()
  registerCosechasHandlers()
  registerPreciosHandlers()
}
