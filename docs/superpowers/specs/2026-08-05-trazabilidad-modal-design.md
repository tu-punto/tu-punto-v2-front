# Diseno del modal de trazabilidad

## Objetivo

Hacer que el modal de trazabilidad sea entendible para superadmins no tecnicos, priorizando lenguaje de negocio sobre claves internas del sistema y mejorando la capacidad de filtrar eventos por accion y por usuario actor.

## Alcance

- Reemplazar etiquetas tecnicas como `shipping.attach_sales` por nombres legibles para negocio.
- Agrupar acciones en categorias de negocio.
- Agregar filtro de accion en dos niveles: categoria y accion.
- Agregar filtro de actor por usuario especifico.
- Mantener la trazabilidad tecnica original en backend sin renombrar ni migrar eventos guardados.

## Enfoque elegido

Se implementara una capa de presentacion en frontend que traduzca `actionType`, `sourceModule` y `entityType` a etiquetas entendibles. El backend seguira almacenando y filtrando por los valores tecnicos actuales, y solo se ampliara para exponer opciones de actores disponibles para el filtro.

Este enfoque evita acoplar la auditoria tecnica con texto de interfaz, conserva compatibilidad con eventos ya registrados y permite seguir agregando nuevas acciones tecnicas sin reestructurar datos historicos.

## Modelo de presentacion

Cada `actionType` conocido tendra una definicion central con:

- `categoryKey`: categoria tecnica estable
- `categoryLabel`: nombre visible de negocio
- `actionLabel`: nombre visible de la accion
- `moduleLabel`: area del sistema visible
- `entityLabel`: tipo de registro visible

Ejemplos:

- `sale.register` -> categoria `Ventas` -> accion `Venta registrada`
- `shipping.create` -> categoria `Entregas` -> accion `Pedido realizado`
- `shipping.attach_sales` -> categoria `Entregas` -> accion `Ventas asociadas al pedido`
- `entry.create` -> categoria `Entradas` -> accion `Entrada de producto registrada`
- `finance_flux.create` -> categoria `Ingresos y gastos` -> accion dependiente del tipo financiero cuando exista contexto suficiente; si no existe, `Movimiento financiero registrado`

Las acciones no mapeadas se mostraran en la categoria `Otros` con una etiqueta fallback derivada del codigo tecnico.

## Cambios de interfaz

### Filtros

El encabezado del modal tendra:

- Busqueda general
- Estado
- Categoria
- Accion
- Usuario actor
- Rango de fechas
- Boton de limpiar filtros

Comportamiento:

- El selector de `Accion` depende de la categoria elegida.
- Si no hay categoria elegida, el selector de `Accion` queda deshabilitado o vacio.
- El selector de `Usuario actor` lista usuarios reales tomados del historial de trazabilidad.

### Tabla

La tabla seguira mostrando detalle operativo pero con encabezados y valores mas legibles:

- `Fecha`
- `Estado`
- `Categoria`
- `Accion`
- `Resumen`
- `Usuario`
- `Area del sistema`
- `Tipo de registro`
- `Error`

La columna `Resumen` mantiene el detalle narrativo actual. `Area del sistema` y `Tipo de registro` usan nombres de negocio cuando exista mapeo.

## Backend

### Listado principal

Se reutiliza el endpoint actual de trazabilidad porque ya soporta:

- `status`
- `actionType`
- `actorUserId`
- fechas
- busqueda general

### Opciones de actores

Se agregara un endpoint liviano para devolver actores disponibles desde la coleccion de trazabilidad con:

- `actorUserId`
- `actorName`
- `actorRole`

El resultado se devolvera deduplicado por `actorUserId`, ordenado por nombre visible.

## Manejo de vacios y casos limite

- Si una accion no esta en el diccionario, se mostrara bajo `Otros`.
- Si un evento no tiene actor identificable, se mostrara `Sistema` o `Sin usuario` segun el contexto visible.
- Si no existen actores en el historial, el filtro de usuario queda vacio sin bloquear el modal.

## Testing

- Verificar que los eventos conocidos se rendericen con nombres entendibles.
- Verificar dependencia entre categoria y accion.
- Verificar que filtrar por usuario envíe `actorUserId`.
- Verificar que limpiar filtros restablezca todos los selectores.
- Verificar render de acciones desconocidas sin romper la tabla.
