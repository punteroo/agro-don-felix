# Requisitos del Sistema — Agro Don Félix

---

## Prefacio

El presente documento especifica los requisitos funcionales y no funcionales del sistema _Control Agrario Agro Don Félix_, desarrollado en el marco de las Prácticas Supervisadas de la carrera Ingeniería en Sistemas de Información de la UTN Facultad Regional Villa María, año 2025.

El documento está organizado en tres secciones principales: los actores del sistema, los requisitos funcionales descritos como casos de uso, y los requisitos no funcionales que condicionan la calidad del sistema. Su propósito es servir de referencia tanto para la validación del producto desarrollado como para el análisis de eventuales extensiones futuras.

---

## Actores del sistema

El sistema cuenta con un único perfil de usuario, ya que se trata de una herramienta de uso interno sin autenticación diferenciada.

**Usuario operativo**
Personal administrativo o de campo de Agro Don Félix S.A.S. que utiliza el sistema para registrar y consultar información productiva. Puede corresponder tanto a un encargado de producción que carga datos desde el campo como a un administrativo que genera reportes para reuniones o auditorías. No se requieren conocimientos técnicos avanzados; se asume familiaridad básica con aplicaciones de escritorio.

---

## Requisitos funcionales

Los requisitos funcionales se agrupan por módulo. Cada módulo corresponde a una sección navegable de la aplicación.

---

### Módulo: Cultivos

| ID | Requisito |
|----|-----------|
| RF-01 | El sistema debe permitir registrar un nuevo tipo de cultivo indicando únicamente su nombre. |
| RF-02 | El sistema debe impedir el registro de dos cultivos con el mismo nombre. |
| RF-03 | El sistema debe permitir eliminar un tipo de cultivo siempre que no tenga cosechas asociadas. |
| RF-04 | El sistema debe listar todos los cultivos disponibles, utilizándolos como opciones en los formularios de cosechas y precios. |

---

### Módulo: Lotes

| ID | Requisito |
|----|-----------|
| RF-05 | El sistema debe permitir registrar un lote productivo con nombre, ubicación (opcional) y superficie en hectáreas. |
| RF-06 | La superficie de un lote debe ser un valor positivo mayor que cero. |
| RF-07 | El sistema debe permitir editar los datos de un lote existente. |
| RF-08 | El sistema debe permitir eliminar un lote. Al hacerlo, todas las cosechas asociadas deben eliminarse en cascada. |
| RF-09 | El sistema debe listar todos los lotes con sus estadísticas derivadas: cantidad de cosechas registradas y producción total acumulada en toneladas. |

---

### Módulo: Cosechas

| ID | Requisito |
|----|-----------|
| RF-10 | El sistema debe permitir registrar una cosecha asociando un lote, un tipo de cultivo y una temporada. |
| RF-11 | La temporada debe expresarse como un año simple (ej. `2025`) o como un rango interanual (ej. `2024/2025`). Si se ingresa un rango, el año de fin debe ser mayor al año de inicio. |
| RF-12 | El dato que el usuario ingresa para cuantificar la producción es la **producción total en toneladas** cosechadas en el lote. El sistema calcula y almacena automáticamente el rendimiento en kg/ha mediante la fórmula `rendimiento = produccion_tn × 1000 / superficie_ha`. |
| RF-13 | El formulario de cosecha debe mostrar en tiempo real el rendimiento calculado (kg/ha) a medida que el usuario ingresa la producción total, siempre que un lote esté seleccionado. |
| RF-14 | Una cosecha puede registrarse **en curso** (implantación sin producción aún): en ese caso la producción total se registra como cero y la fecha de cosecha se deja vacía. |
| RF-15 | El sistema debe permitir registrar opcionalmente la fecha de cosecha, el porcentaje de humedad del grano y observaciones de texto libre. |
| RF-16 | El sistema debe permitir editar una cosecha existente. Al abrir una cosecha en modo edición, el formulario debe recalcular y mostrar la producción total en toneladas equivalente al rendimiento almacenado. |
| RF-17 | El sistema debe permitir eliminar una cosecha con confirmación previa. |
| RF-18 | El sistema debe listar todas las cosechas en una tabla paginada, con columnas para temporada, cultivo, lote, superficie, fecha, producción en toneladas, rendimiento en kg/ha y valor estimado. |

---

### Módulo: Precios de referencia

| ID | Requisito |
|----|-----------|
| RF-19 | El sistema debe permitir registrar el precio de referencia por tonelada (en ARS) para un tipo de cultivo en una fecha dada. |
| RF-20 | Si ya existe un precio registrado para la misma combinación de cultivo y fecha, el sistema debe actualizarlo en lugar de crear un duplicado (operación upsert). |
| RF-21 | El campo fuente debe identificar el origen de la cotización (ej. MATba-ROFEX, Bolsa Rosario). Su valor por defecto es `MATba-ROFEX`. |
| RF-22 | El sistema debe permitir eliminar un registro de precio con confirmación previa. |
| RF-23 | El sistema debe listar el historial completo de precios por cultivo, ordenado por fecha descendente. |

---

### Módulo: Panel principal (_Dashboard_)

| ID | Requisito |
|----|-----------|
| RF-24 | El panel debe mostrar métricas agregadas del total del sistema: cantidad de lotes, superficie total en hectáreas, cantidad de cosechas completadas, producción total en toneladas y valor estimado del portfolio en ARS. |
| RF-25 | El valor estimado se calcula multiplicando la producción de cada cosecha por el último precio de referencia disponible para ese cultivo. Sólo se muestra si existe al menos un precio registrado. |
| RF-26 | El panel debe mostrar un gráfico de barras con la producción total en toneladas por tipo de cultivo, usando colores diferenciados por especie. |
| RF-27 | El panel debe mostrar una tabla con los últimos precios de referencia registrados por cultivo, indicando la fecha de la cotización. |
| RF-28 | Cuando los valores financieros superen el millón de pesos, el panel debe mostrarlos en formato abreviado (ej. `$ 282M ARS`) acompañados del importe completo en texto de menor tamaño para evitar pérdida de información. |

---

### Módulo: Reportes y analítica

| ID | Requisito |
|----|-----------|
| RF-29 | La página de reportes debe permitir filtrar los datos por tipo de cultivo, lote y temporada, de forma individual o combinada. Los filtros deben poder limpiarse con una sola acción. |
| RF-30 | Los cálculos analíticos deben recalcularse en memoria al modificar los filtros, sin realizar consultas adicionales a la base de datos. |
| RF-31 | La página debe mostrar tarjetas de resumen con: cantidad de registros filtrados, producción completada en toneladas, valor estimado y proyección en curso. Los valores financieros deben seguir la regla de formato abreviado + detalle (RF-28). |
| RF-32 | La página debe mostrar un gráfico de **barras agrupadas** con la producción por temporada, desglosada por tipo de cultivo, permitiendo comparar campañas históricas. |
| RF-33 | La página debe mostrar un **gráfico de dona** con la distribución del valor estimado por tipo de cultivo, usando el último precio disponible por especie. |
| RF-34 | La página debe mostrar un **gráfico de barras horizontales** con el rendimiento promedio histórico por lote para cada cultivo, facilitando la comparación de performance entre parcelas. |
| RF-35 | La página debe mostrar un **gráfico de líneas** con la evolución de los precios de referencia a lo largo del tiempo, con una serie por tipo de cultivo. |
| RF-36 | La página debe mostrar **tarjetas de proyección** para las implantaciones en curso (producción cero, sin fecha de cosecha). Para cada una, el sistema debe estimar el rendimiento probable usando el historial del mismo cultivo en el mismo lote; si no existe historial específico para ese lote, utiliza el promedio general del cultivo. Las tarjetas deben indicar la fuente del estimado. |
| RF-37 | La página debe incluir una **vista previa tabular** de los datos filtrados, colapsada por defecto. El botón de exportación debe permanecer visible en todo momento, independientemente del estado de la vista previa. |
| RF-38 | El sistema debe permitir exportar los datos filtrados a un archivo `.xlsx`. La exportación debe incluir únicamente las cosechas completadas (producción mayor a cero), excluyendo las implantaciones en curso. |
| RF-39 | El archivo Excel exportado debe contener dos hojas: **Cosechas** con el detalle registro por registro, y **Resumen por cultivo** con totales agrupados. El nombre del archivo debe incluir la fecha de exportación y los filtros activos. |

---

## Casos de uso

Los siguientes casos de uso describen los flujos de mayor complejidad o relevancia del negocio. Cada uno incluye la historia de usuario que lo motiva, sus criterios de aceptación verificables y la descripción completa del flujo.

---

### CU-01 — Registrar cosecha completada

> **Como** usuario operativo **quiero** registrar la producción total cosechada en un lote **para** mantener el historial productivo de la empresa y obtener el rendimiento por hectárea de forma automática sin necesidad de calcularlo manualmente.

**Criterios de aceptación:**

- El formulario requiere lote, cultivo, temporada y producción total en toneladas para poder guardar.
- El campo de producción total acepta valores en toneladas (≥ 0) con hasta tres decimales.
- Con un lote seleccionado y producción ingresada, el sistema muestra en tiempo real el rendimiento calculado en kg/ha mediante `produccion_tn × 1000 / superficie_ha`, sin necesidad de guardar.
- La temporada admite año simple (`YYYY`) o rango interanual (`YYYY/YYYY`); en un rango, el año de fin debe ser estrictamente mayor al de inicio.
- Si algún campo obligatorio está vacío o es inválido, el formulario muestra el mensaje de error junto al campo afectado y no realiza ninguna operación sobre la base de datos.
- Al guardar exitosamente, el formulario se cierra, la tabla de cosechas refleja el nuevo registro y aparece una notificación de confirmación.
- El valor almacenado en la base de datos es siempre el rendimiento en kg/ha derivado de las toneladas ingresadas; el usuario nunca ingresa kg/ha directamente.

**Precondición:** Existe al menos un lote y un cultivo registrados en el sistema.

**Flujo principal:**

1. El usuario navega a _Cosechas_ y presiona _Nueva cosecha_.
2. El sistema abre el formulario con la temporada de la campaña actual precargada.
3. El usuario selecciona el lote y el cultivo correspondientes.
4. El usuario ingresa o ajusta la temporada.
5. El usuario ingresa la producción total cosechada en toneladas.
6. El sistema muestra en tiempo real el rendimiento calculado en kg/ha.
7. Opcionalmente, el usuario registra la fecha de cosecha, el porcentaje de humedad y observaciones.
8. El usuario presiona _Registrar cosecha_.
9. El sistema valida los campos obligatorios y la coherencia de la temporada.
10. El sistema calcula el rendimiento definitivo y persiste el registro.
11. El formulario se cierra, la tabla se actualiza y se muestra un mensaje de confirmación.

**Flujos alternativos:**

_A. Falla de validación (paso 9):_ El formulario permanece abierto con los datos intactos y muestra los mensajes de error en línea por cada campo inválido. No se realiza ninguna llamada a la base de datos.

_B. Error de persistencia (paso 10):_ El formulario permanece abierto. Se muestra un mensaje de error mediante notificación emergente; el usuario puede reintentar o cancelar.

**Postcondición:** La cosecha queda registrada con el rendimiento derivado de la producción total ingresada. El dashboard y los reportes reflejan los nuevos valores en la siguiente carga.

---

### CU-02 — Registrar implantación en curso

> **Como** usuario operativo **quiero** registrar un cultivo sembrado que todavía no fue cosechado **para** que el sistema pueda generar una proyección del valor económico esperado de esa campaña antes de que se produzca la cosecha real.

**Criterios de aceptación:**

- El sistema permite guardar una cosecha con producción total igual a cero.
- Cuando la producción es cero, la fecha de cosecha no es requerida.
- El formulario no muestra el indicador de rendimiento calculado cuando la producción es cero.
- El registro aparece en la tabla de cosechas diferenciado del resto (sin fecha ni producción).
- La sección de proyecciones en Reportes incluye automáticamente este registro y genera una tarjeta de estimación de producción y valor sin acción adicional del usuario.
- Si el mismo lote y cultivo ya tienen historial completado, la proyección usa ese historial como base; de lo contrario, usa el promedio general del cultivo.

**Precondición:** Existe al menos un lote y un cultivo registrados en el sistema.

**Flujo principal:**

1. El usuario abre el formulario de nueva cosecha.
2. El usuario selecciona lote, cultivo y temporada.
3. El usuario ingresa `0` en el campo de producción total.
4. El usuario deja la fecha de cosecha vacía.
5. Opcionalmente registra observaciones con la estimación esperada.
6. El usuario guarda el registro.

**Flujos alternativos:**

_A. Sin historial para ese cultivo en ningún lote (paso 6):_ El sistema registra la implantación sin generar proyección, ya que no dispone de base histórica para estimarla. La tarjeta no aparece en Reportes para ese registro.

**Postcondición:** El registro queda guardado con producción y rendimiento iguales a cero. El módulo de Reportes lo identifica como implantación en curso y genera una proyección automática basada en el historial disponible.

---

### CU-03 — Registrar precio de referencia

> **Como** usuario operativo **quiero** cargar el precio de referencia por tonelada de un cultivo **para** que el sistema pueda estimar el valor económico de la producción registrada en el dashboard y los reportes.

**Criterios de aceptación:**

- El formulario requiere cultivo, precio por tonelada en ARS (> 0) y fecha de la cotización para poder guardar.
- El campo fuente tiene valor por defecto `MATba-ROFEX` y puede modificarse libremente.
- Si ya existe un precio para ese cultivo en esa misma fecha, el sistema lo actualiza sin crear un duplicado y sin requerir acción adicional del usuario.
- El botón de guardar se deshabilita durante el proceso de guardado para evitar el doble envío; se reactiva si ocurre un error.
- Al guardar exitosamente, el formulario se cierra y la tabla de precios muestra el nuevo registro.
- Los cálculos de valor estimado en el dashboard y los reportes reflejan el nuevo precio en la siguiente consulta.

**Precondición:** Existe al menos un cultivo registrado en el sistema.

**Flujo principal:**

1. El usuario navega a _Precios_ y presiona _Registrar precio_.
2. El usuario selecciona el cultivo, ingresa el precio por tonelada en ARS, la fecha de la cotización y confirma o edita la fuente.
3. El usuario presiona _Guardar_.
4. El sistema valida que el precio sea mayor a cero y que los campos obligatorios estén completos.
5. El sistema ejecuta un upsert: actualiza el registro si existe la misma combinación cultivo–fecha, o crea uno nuevo si no existe.
6. El formulario se cierra y la tabla de precios se actualiza.

**Flujos alternativos:**

_A. Falla de validación (paso 4):_ El formulario permanece abierto con los datos intactos y señala el error en línea junto al campo afectado.

_B. Error de persistencia (paso 5):_ El formulario permanece abierto y se muestra una notificación de error. El botón de guardar se reactiva para permitir el reintento.

**Postcondición:** El precio queda disponible para los cálculos de valor estimado en el dashboard y los reportes. Si el precio actualiza uno existente, los cálculos usan el nuevo valor desde ese momento.

---

### CU-04 — Generar reporte analítico filtrado

> **Como** usuario operativo **quiero** analizar la producción histórica filtrando por cultivo, lote y temporada **para** identificar tendencias, comparar el rendimiento entre campañas y estimar el valor del portfolio bajo distintos escenarios de precios.

**Criterios de aceptación:**

- Al abrir la página, el sistema carga en paralelo el historial completo de cosechas, lotes, cultivos y precios en una sola operación.
- Los filtros de cultivo, lote y temporada pueden activarse de forma independiente o combinada.
- Al modificar cualquier filtro, todos los gráficos y tarjetas de resumen se recalculan en memoria de forma instantánea, sin generar nuevas consultas a la base de datos.
- Todos los filtros activos pueden limpiarse en una sola acción.
- La página presenta cuatro gráficos: barras agrupadas por temporada, dona de valor por cultivo, barras horizontales de rendimiento por lote y líneas de evolución de precios.
- Las tarjetas de resumen muestran registros, producción completada en toneladas, valor estimado y proyección en curso; los valores financieros superiores al millón de pesos se presentan en formato abreviado con el importe completo debajo.
- Si los filtros activos no producen cosechas completadas, los gráficos aparecen vacíos y el botón de exportación queda deshabilitado.

**Precondición:** Existen cosechas registradas en el sistema.

**Flujo principal:**

1. El usuario navega a _Reportes_.
2. El sistema carga en paralelo cosechas, cultivos, lotes y el historial completo de precios.
3. El sistema calcula y muestra las tarjetas de resumen, los cuatro gráficos analíticos y, si corresponde, las tarjetas de proyección de implantaciones en curso.
4. El usuario selecciona uno o más filtros.
5. El sistema recalcula todas las visualizaciones en memoria sin consultar la base de datos.
6. El usuario examina los resultados.

**Flujos alternativos:**

_A. Sin cosechas completadas para los filtros seleccionados (paso 5):_ Los gráficos quedan vacíos, las tarjetas de resumen muestran cero y el botón de exportación permanece deshabilitado.

_B. Sin precios registrados (paso 3):_ Los gráficos de valor y la tarjeta de valor estimado no se muestran; el resto de las visualizaciones funciona con normalidad.

**Postcondición:** El usuario dispone de una visión analítica de la producción para el subconjunto de datos seleccionado. Los cálculos permanecen en memoria mientras la página permanece abierta.

---

### CU-05 — Exportar reporte a Excel

> **Como** usuario operativo **quiero** exportar los datos del reporte filtrado a un archivo Excel **para** compartirlos en reuniones, auditorías o análisis externos sin depender de la disponibilidad del sistema ni de conocimientos técnicos del destinatario.

**Criterios de aceptación:**

- El botón de exportación permanece visible en todo momento, independientemente del estado de la vista previa tabular (colapsada o expandida).
- El botón está deshabilitado cuando no hay cosechas completadas en el conjunto filtrado activo.
- El archivo exportado contiene exactamente dos hojas: _Cosechas_ con el detalle registro por registro y _Resumen por cultivo_ con totales agrupados por tipo de grano.
- Las implantaciones en curso (producción = 0) quedan excluidas del archivo exportado.
- El nombre del archivo incluye la fecha de exportación y los filtros activos al momento de la acción.
- La exportación no genera ninguna consulta adicional a la base de datos; utiliza los datos ya cargados en memoria.
- El archivo se descarga automáticamente sin requerir que el usuario elija ubicación o nombre.

**Precondición:** Existe al menos una cosecha completada (producción > 0) que coincida con los filtros activos en la página de Reportes.

**Flujo principal:**

1. Con los filtros deseados activos, el usuario presiona _Exportar a Excel_.
2. El sistema filtra en memoria las cosechas completadas, excluyendo las implantaciones en curso.
3. El sistema construye el libro `.xlsx` con la hoja de detalle y la hoja de resumen.
4. El archivo se descarga automáticamente con el nombre generado a partir de los filtros y la fecha.

**Flujos alternativos:**

_A. Sin cosechas completadas en el filtro actual:_ El botón permanece deshabilitado; no se ejecuta ninguna acción al intentar presionarlo.

**Postcondición:** El usuario dispone de un archivo Excel autocontenido, listo para su uso externo sin necesidad de procesamiento adicional.

---

### CU-06 — Consultar proyecciones de campaña en curso

> **Como** usuario operativo **quiero** ver una estimación del valor económico esperado de los cultivos sembrados que todavía no se cosecharon **para** anticipar el resultado de la campaña y apoyar decisiones de comercialización antes del cierre productivo.

**Criterios de aceptación:**

- Las tarjetas de proyección aparecen automáticamente en la página de Reportes cuando el conjunto filtrado contiene implantaciones en curso; no requieren acción explícita del usuario.
- Cada tarjeta muestra: nombre del lote, tipo de cultivo, rendimiento estimado en kg/ha, producción estimada en toneladas y valor proyectado en ARS.
- Si existe historial completado del mismo cultivo en el mismo lote, la proyección usa el promedio histórico de rendimiento de esa combinación específica.
- Si no existe historial para ese lote pero sí para ese cultivo en otros lotes, la proyección usa el promedio general del cultivo como base.
- Cada tarjeta indica explícitamente la fuente utilizada para el estimado (_Historial del lote_ o _Promedio general_).
- El valor proyectado se calcula multiplicando la producción estimada por el último precio de referencia disponible para ese cultivo.
- Los valores financieros superiores al millón de pesos se presentan en formato abreviado con el importe completo debajo.
- Si no existe ningún precio de referencia para el cultivo en curso, la tarjeta muestra la producción estimada pero omite el valor proyectado.

**Precondición:** Existen implantaciones en curso (cosechas con producción cero y sin fecha de cosecha) dentro del conjunto filtrado, y existe historial completado de al menos un cultivo en el sistema.

**Flujo principal:**

1. El usuario accede a la página de Reportes (con o sin filtros activos).
2. El sistema identifica automáticamente las cosechas en curso dentro del conjunto filtrado.
3. Para cada implantación, el sistema busca el historial completado del mismo cultivo en el mismo lote y calcula el rendimiento promedio. Si no hay historial específico para ese lote, usa el promedio general del cultivo.
4. El sistema estima la producción proyectada (`avgRend × superficie_ha / 1000`) y el valor proyectado (`estTn × últimoPrecio`).
5. Las tarjetas de proyección se presentan debajo de los gráficos principales, una por implantación en curso.

**Flujos alternativos:**

_A. Sin historial de ningún cultivo en el sistema (paso 3):_ No se puede calcular ningún promedio. Las tarjetas no se muestran aunque existan implantaciones en curso.

_B. Sin precio de referencia para ese cultivo (paso 4):_ La tarjeta se muestra con la producción estimada pero sin el valor proyectado en ARS.

**Postcondición:** El usuario dispone de una estimación diferenciada por lote y cultivo del valor económico de la campaña en curso, con trazabilidad explícita de la fuente de cada estimado.

---

## Requisitos no funcionales

| ID | Categoría | Requisito |
|----|-----------|-----------|
| RNF-01 | Disponibilidad | El sistema debe funcionar en su totalidad sin conexión a Internet. Ninguna operación de lectura ni escritura debe depender de servicios externos. La única funcionalidad que requiere conectividad es la consulta opcional a fuentes de precios externas, la cual es manual y nunca bloqueante. |
| RNF-02 | Portabilidad | El sistema debe distribuirse como un ejecutable autocontenido para Windows, sin requerir la instalación previa de ningún runtime, servidor o gestor de base de datos. |
| RNF-03 | Rendimiento | Todas las operaciones de lectura y escritura sobre la base de datos deben completarse en menos de 500 ms bajo condiciones normales de uso (hasta 10.000 registros de cosechas). Los cálculos analíticos en memoria deben actualizarse en menos de 100 ms al modificar los filtros. |
| RNF-04 | Integridad de datos | La base de datos debe mantener integridad referencial en todo momento. La eliminación de un lote debe propagar la eliminación de sus cosechas asociadas. No deben existir dos cotizaciones para el mismo cultivo en la misma fecha. |
| RNF-05 | Usabilidad | El sistema debe ser operable por personal administrativo sin formación técnica específica. Los formularios deben validar los datos en línea (sin requerir envío) y mostrar mensajes de error descriptivos en el campo correspondiente. Las operaciones destructivas (eliminación) deben requerir confirmación explícita. |
| RNF-06 | Consistencia visual | La interfaz debe soportar tema claro y tema oscuro, detectando la preferencia del sistema operativo en el primer inicio. El tema seleccionado debe persistir entre sesiones. Todos los elementos de la interfaz deben ser legibles en ambos modos. |
| RNF-07 | Persistencia | Los datos deben persistir entre sesiones en un archivo SQLite local. La base de datos debe inicializarse automáticamente si no existe al iniciar la aplicación. |
| RNF-08 | Seguridad interna | El proceso de renderizado no debe tener acceso directo a las APIs de Node.js ni al sistema de archivos. Toda comunicación entre la interfaz y la base de datos debe realizarse a través del canal IPC. |

---

## Restricciones del proyecto

- El sistema no contempla múltiples usuarios simultáneos ni control de acceso por roles; está diseñado para uso monousuario en una estación de trabajo.
- El ingreso de precios de referencia es manual. El sistema no realiza consultas automáticas a APIs de mercado (MATba-ROFEX, Bolsa Rosario u otras).
- El sistema no gestiona la logística de comercialización ni contratos de venta; su alcance se limita al registro productivo y la estimación de valor.
- La exportación a Excel produce un archivo estático; no existe integración bidireccional con hojas de cálculo externas.
