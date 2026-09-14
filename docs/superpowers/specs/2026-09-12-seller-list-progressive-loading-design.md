# Carga progresiva de vendedores

## Objetivo

Mostrar primero la lista paginada de vendedores y completar de forma independiente sus saldos, el total de pago pendiente y las alertas. Los cálculos existentes de saldo no cambian.

## Frontend

- La consulta inicial trae la página ligera de vendedores y permite renderizar nombre, estado, vigencia, fecha de pago, pago mensual, comisión, factura y acciones.
- Al recibir una página, el cliente solicita las métricas de los IDs visibles. La columna `Pago pendiente` muestra un spinner por fila hasta recibir el resultado.
- El total `Pago pendiente Bs.` se obtiene con una consulta de resumen separada. Conserva un spinner mientras carga y se actualiza para los filtros vigentes.
- Las alertas superiores solicitan sólo sus conteos inicialmente. El detalle se solicita paginado al elegir `Ver más`.
- Cada consulta conserva una clave o secuencia de solicitud para ignorar respuestas obsoletas después de cambiar filtros, página u orden.

## Orden y paginación

- Al cambiar filtros, búsqueda, tamaño de página o una orden real, la página pasa a 1.
- Al navegar páginas con una orden existente, no se vuelve a escribir el mismo estado de orden y por tanto no se reinicia la página.
- El tercer clic de orden limpia `sortBy` y `sortOrder`; el backend vuelve al orden base por nombre, apellido e ID.
- Ordenar por pago pendiente sigue usando el resultado global del servidor para mantener un orden correcto; la interfaz muestra carga para esa operación.

## Compatibilidad y errores

- Los montos se obtienen mediante la misma lógica backend ya usada por la tabla actual; no se duplican fórmulas en el cliente.
- Un fallo de métricas no borra la lista; muestra el error localizado y permite reintentar en el siguiente refresh.
- La interfaz conserva filtros, acciones y cambios locales existentes de cancelación de solicitud de cobro.

## Verificación

- La tabla aparece antes de que concluyan saldo total y alertas.
- Cada saldo por fila coincide con el cálculo anterior.
- El total y conteos coinciden con sus valores anteriores para el mismo filtro.
- Con filtro y orden activos se puede ir a cualquier página; cambiar el orden o filtro regresa a la primera.
