# Recálculo de búsqueda de stock por palabras

## Problema

La tabla administrativa de stock construye sus filas filtradas dentro de un efecto que solo depende de la lista de productos. Al cambiar el texto de búsqueda, el efecto no se ejecuta, por lo que la tabla sigue mostrando los resultados previos aunque la comparación por producto y variante sea correcta.

## Cambio

Incluir el texto de búsqueda y la lista de vendedores vigentes en las dependencias del efecto que genera los grupos visibles. La comparación existente se mantiene sobre el texto combinado de nombre de producto y variante, exigiendo todas las palabras sin importar su orden.

## Aislamiento y verificación

No se modifica la consulta de productos, los filtros de sucursal/categoría/vendedor, el agrupamiento, el stock, ni las acciones de edición. Al cambiar el texto, una variante `Mochila - Negra/Grande` coincide con `negra mochila` y `mochila grande`; al limpiar el texto reaparecen los grupos previos.
