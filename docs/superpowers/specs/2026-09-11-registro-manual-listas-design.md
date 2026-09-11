# Registro manual de listas de ingreso

## Objetivo

Sustituir el indicador derivado de archivo subido por un registro operativo manual para las listas de ingreso de encargados.

## Comportamiento

- Se agrega `isRegistrado` a cada guía/lista, con valor inicial `false`.
- La columna `¿Registrado?` muestra rojo mientras sea `false` y verde al ser `true`.
- El filtro de registrados usa exclusivamente `isRegistrado`.
- Las acciones de lista incorporan un botón de confirmación para marcar como registrado.
- La confirmación es de un solo sentido, igual que `isRecogido`: una lista registrada no se desmarca desde la tabla.

## Acceso y datos existentes

Solo `admin`, `superadmin` y `operator` pueden marcar una lista como registrada. Los vendedores conservan su experiencia actual.

Los documentos existentes que no posean el nuevo campo se interpretan como no registrados; no requiere migración.

## Verificación

- Registro nuevo y existente: rojo antes de la acción, verde después.
- Actualización local de la fila y persistencia tras recargar.
- Filtros de registrados y recogidos combinados.
- Verificar rechazo de la API para roles no autorizados.
