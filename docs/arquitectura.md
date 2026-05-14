# Documentación Técnica — Agro Don Félix

---

## Prefacio

El presente documento describe el diseño y la arquitectura del sistema _Web Personalizada para Control Agrario_, desarrollado en el marco de las Prácticas Supervisadas de la carrera Ingeniería en Sistemas de Información de la UTN Facultad Regional Villa María, año 2025.

El proyecto fue encargado por Agro Don Félix S.A.S., empresa dedicada a la producción agrícola integral en la provincia de Córdoba, Argentina. La empresa requería una herramienta informática propia para gestionar sus registros de cosechas, sus lotes productivos y las cotizaciones de referencia de granos, de manera ordenada y sin depender de conectividad permanente a Internet.

El sistema está destinado al uso interno de la empresa, principalmente por parte del personal administrativo y de campo que realiza el seguimiento productivo de cada temporada.

---

## Valor

La actividad agropecuaria implica el manejo de grandes volúmenes de información que, en la mayoría de las empresas del sector, se registra en planillas físicas o archivos de hoja de cálculo no estructurados. Esta modalidad dificulta la consulta histórica, aumenta el riesgo de pérdida de datos y hace lenta la toma de decisiones, especialmente en lo que respecta a la estimación del valor económico de la producción.

Un sistema centralizado y estructurado como el desarrollado en este proyecto aporta los siguientes beneficios:

- Eliminación de duplicidades y errores en el registro de cosechas.
- Cálculo automático de la producción total y del valor estimado en función de precios de referencia.
- Generación de reportes exportables a Excel para uso en reuniones, auditorías o análisis externos.
- Visualización gráfica de la evolución de la producción, facilitando la comparación entre cultivos y temporadas.
- Independencia de conexión a Internet para las operaciones diarias, característica crítica en zonas rurales.

---

## Arquitectura

El sistema es una aplicación de escritorio construida sobre la plataforma Electron, que combina un proceso de Node.js en el backend con una interfaz de usuario React en el frontend, comunicados mediante un canal seguro de mensajería entre procesos (IPC).

### Decisiones arquitectónicas

**Electron como entorno de ejecución**
Se eligió Electron porque permite empaquetar una aplicación web moderna como ejecutable nativo para Windows (y potencialmente macOS y Linux) sin requerir infraestructura de servidor. Esto es determinante para el contexto de la empresa, que opera en entornos rurales con acceso limitado a Internet y no dispone de un servidor dedicado.

**SQLite a través de better-sqlite3**
La base de datos elegida es SQLite, un motor relacional embebido que persiste toda la información en un único archivo en disco. Se optó por el driver `better-sqlite3` por su API sincrónica, que simplifica el código del proceso principal y elimina la complejidad del manejo de concurrencia típica de drivers asíncronos. La base de datos se inicializa en cada arranque de la aplicación y se cierra ordenadamente al salir.

**Separación main / renderer / preload**
Electron impone una separación entre el proceso principal (`main`), donde reside el acceso a Node.js y a los recursos del sistema operativo, y el proceso de renderizado (`renderer`), que ejecuta el código React en un contexto de navegador. El módulo `preload` actúa como puente de comunicación segura: expone a través de `contextBridge` una API tipada (`window.api`) que el renderer puede invocar sin acceso directo a Node.js. Esta separación sigue el principio de menor privilegio y evita vulnerabilidades de inyección de código.

**IPC (Inter-Process Communication)**
Toda comunicación entre el renderer y la base de datos pasa por el mecanismo `ipcRenderer.invoke` / `ipcMain.handle`. Cada dominio de negocio (cultivos, lotes, cosechas, precios) tiene su propio módulo de handlers registrado al inicio de la aplicación. Esta organización facilita la mantenibilidad y el agregado de nuevas entidades sin modificar estructuras existentes.

**React con TypeScript y PrimeReact**
El renderer utiliza React 19 con TypeScript para la construcción de la interfaz. La biblioteca de componentes PrimeReact provee tablas, formularios y diálogos listos para usar, lo que acelera el desarrollo y garantiza consistencia visual. Vite, integrado mediante `electron-vite`, ofrece hot module replacement durante el desarrollo y builds optimizados para distribución.

**recharts para visualizaciones**
Los gráficos del panel principal se implementan con recharts, biblioteca de gráficos basada en componentes React que permite componer visualizaciones de manera declarativa. Se optó por esta biblioteca por su integración natural con el ecosistema React y su ligereza relativa frente a alternativas como D3.

**xlsx para exportación a Excel**
La exportación de reportes históricos a formato Excel se realiza mediante la biblioteca `xlsx` (SheetJS), que genera archivos `.xlsx` directamente en el proceso renderer sin dependencias nativas. El archivo exportado incluye una hoja de detalle con todos los registros filtrados y una hoja de resumen agrupada por cultivo.

---

### Diseño

Esta sección presenta los artefactos que describen el aspecto de diseño del software: la estructura interna de componentes y servicios, las secuencias de interacción entre capas y el mecanismo de mensajería entre procesos.

#### Diagrama de clases de diseño

_[Diagrama: design-classes]_

El diagrama muestra la arquitectura en tres capas: el proceso principal con sus handlers de IPC y el acceso a SQLite, el módulo preload con la interfaz `AppAPI` expuesta al renderer, y el proceso renderer con los servicios tipados, las páginas (componentes de ruta) y los componentes de formulario reutilizables. Las dependencias entre capas siguen estrictamente la dirección renderer → preload → main, lo cual es una restricción impuesta por el modelo de seguridad de Electron. No existe ningún camino inverso: el proceso principal nunca llama directamente a código del renderer.

#### Diagrama de secuencia: creación de cosecha

_[Diagrama: sequence-crear-cosecha]_

Este diagrama ilustra el flujo completo desde que el usuario abre el formulario de nueva cosecha hasta que el registro es persistido y la tabla se actualiza. El punto de mayor interés es la transición del renderer al proceso principal a través del canal IPC: desde la perspectiva del renderer, la operación es una llamada a promesa; en el proceso principal, es una consulta sincrónica a SQLite. El diagrama también muestra el manejo de la validación: si los campos obligatorios no están completos, el formulario permanece abierto y muestra mensajes de error sin invocar el IPC.

#### Diagrama de secuencia: carga analítica de Reportes

_[Diagrama: sequence-reportes-analytics]_

La página de Reportes combina cuatro consultas paralelas (cosechas, cultivos, lotes, historial completo de precios) con un motor de cálculo que opera íntegramente en memoria mediante `useMemo()`. Una vez recibidos los datos, se ejecutan cinco funciones puras que producen las estructuras de datos necesarias para cada visualización:

- **Producción por temporada**: agrupa las cosechas completadas por temporada y cultivo, acumulando la producción en toneladas. El resultado alimenta un gráfico de barras agrupadas que permite comparar campañas históricas.

- **Valor estimado por cultivo**: cruza la producción de cada cosecha con el último precio de referencia registrado para ese cultivo y acumula el valor en pesos por tipo de grano. El resultado alimenta un gráfico de dona que expresa la distribución económica del portfolio.

- **Rendimiento promedio por lote**: calcula el promedio histórico de rendimiento (kg/ha) para cada combinación lote–cultivo presente en los datos filtrados. El resultado alimenta un gráfico de barras horizontales que facilita la comparación entre lotes para cada cultivo.

- **Historial de precios**: agrupa todos los registros de `precios_cache` por fecha de cotización y cultivo. El resultado alimenta un gráfico de líneas multiserie que muestra la evolución mensual de precios en el período registrado.

- **Proyección de campaña en curso**: identifica las cosechas registradas con `rendimiento = 0` y sin `fecha_cosecha`, que representan implantaciones cuya cosecha aún no se ha producido. Para cada una, estima el rendimiento probable a partir del historial de ese cultivo en el mismo lote; si no existe historial para ese lote, usa el promedio general del cultivo. Multiplica el rendimiento estimado por la superficie del lote y por el último precio registrado para obtener el valor proyectado. El resultado se presenta como tarjetas de proyección individuales, indicando la fuente del estimado (historial del lote o promedio general).

Todos los cálculos se recalculan automáticamente cuando el usuario modifica los filtros activos, sin generar nuevas consultas a SQLite. La vista previa de datos tabulares es colapsable (oculta por defecto) para no distraer de las visualizaciones; el botón de exportación permanece siempre visible sobre el panel colapsable.

#### Diagrama de secuencia: exportación a Excel

_[Diagrama: sequence-export-excel]_

La exportación a Excel es una operación completamente del lado del renderer: los datos ya se encuentran en memoria desde la carga inicial de la página. El diagrama refleja que no hay nueva consulta a SQLite en el momento de exportar; en cambio, los datos son filtrados en memoria según los criterios seleccionados por el usuario y procesados por la biblioteca `xlsx` para producir el archivo. La exportación utiliza exclusivamente las cosechas completadas (aquellas con `rendimiento > 0`), excluyendo las implantaciones en curso para evitar producir un reporte con filas de producción nula. Esto garantiza que la exportación sea instantánea incluso con grandes volúmenes de datos.

#### Diagrama de secuencia: carga del panel principal

_[Diagrama: sequence-dashboard-load]_

El panel principal realiza tres consultas en paralelo mediante `Promise.all()`: cosechas, lotes y últimos precios por cultivo. El diagrama muestra esta concurrencia de forma explícita. Una vez resueltas las tres promesas, las métricas derivadas (producción total, valor estimado, agrupamiento por cultivo para el gráfico) se calculan en el renderer sin consultas adicionales.

---

### Análisis

Esta sección presenta los artefactos que describen el aspecto de análisis del sistema: el modelo de dominio, el esquema físico de la base de datos y el comportamiento dinámico de los formularios más complejos.

#### Diagrama de clases de dominio

_[Diagrama: analysis-domain]_

El modelo de dominio está compuesto por cuatro entidades: `Cultivo`, `Lote`, `Cosecha` y `PrecioCache`. La entidad central del negocio es `Cosecha`, que vincula un lote productivo con un tipo de cultivo para una temporada dada y registra el rendimiento obtenido. `PrecioCache` almacena las cotizaciones de referencia por cultivo y permite calcular el valor estimado de cada cosecha multiplicando su producción en toneladas por el precio vigente. Los atributos `cosecha_count` y `produccion_total_tn` presentes en `Lote` son valores derivados calculados mediante consultas agregadas en la base de datos, no campos almacenados.

#### Diagrama ER de la base de datos

_[Diagrama: er-database]_

El esquema físico de SQLite refleja fielmente el modelo de dominio. Las relaciones clave a destacar son: la restricción `ON DELETE CASCADE` entre `lotes` y `cosechas`, que garantiza integridad referencial al eliminar un lote; y la restricción `UNIQUE (cultivo_id, fecha_precio)` en `precios_cache`, que garantiza una única cotización por cultivo por día y permite el upsert: si se carga una cotización para la misma fecha y cultivo que ya existe, el precio se actualiza en lugar de insertar un registro duplicado. El modo WAL (Write-Ahead Logging) está habilitado para mejorar el rendimiento de escritura concurrente.

#### Diagrama de estado: formulario de registro de precio

_[Diagrama: state-precio-form]_

El diagrama de estados modela el ciclo de vida del diálogo `PrecioFormDialog`. Se eligió este componente para el diagrama de estados por ser el que presenta mayor cantidad de transiciones de estado relevantes: el formulario puede estar cerrado, abierto en ingreso de datos, en proceso de validación, en proceso de guardado (con el botón deshabilitado para evitar doble envío), o en estado de error recuperable. La transición desde `Guardando` hacia `ErrorGuardado` regresa al estado `IngresoData` manteniendo el formulario abierto, lo que permite al usuario corregir el problema sin perder los datos ya ingresados.
