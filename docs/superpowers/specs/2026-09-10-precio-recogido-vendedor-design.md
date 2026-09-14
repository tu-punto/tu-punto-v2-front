# Precio de pedidos simples recogidos por vendedor

## Objetivo

Corregir la inconsistencia de precio en pedidos simples marcados como `Recogido por vendedor`: el precio unitario debe persistirse como cero, verse como cero al editarse y aparecer como cero en el historial de ventas.

## Alcance

El cambio se limita a pedidos simples. No cambia el comportamiento de entregas externas ni de pedidos anteriores.

## Datos y transiciones

Se añadirá un campo nuevo por producto/venta: `precio_antes_recogido`.

- Al pasar un pedido simple a `Recogido por vendedor`, se guarda el valor actual de `precio_unitario` en `precio_antes_recogido` solo si el campo todavía no existe. Después se persiste `precio_unitario` como `0`.
- Al volver de `Recogido por vendedor` a `Entregado`, se restaura `precio_unitario` desde `precio_antes_recogido`, incluso si se intentó editar el precio durante el estado recogido. Después se elimina o limpia el campo de respaldo.
- Si un pedido no tiene `precio_antes_recogido` (pedidos antiguos o nunca recogidos), no se modifica ni se intenta restaurar su precio.
- Repetir los cambios de estado conserva siempre el precio vigente justo antes de cada marcado como recogido.

## Consistencia

La transición se implementará en backend para que el pedido, el modal de edición y el historial de ventas reciban el mismo precio persistido. También se actualizarán los montos, subtotales y saldos derivados que dependan del precio.

## Verificación

- Pedido simple nuevo: pasar a recogido, editar, guardar y comprobar precio/historial en cero.
- Revertir el mismo pedido a entregado y comprobar restauración exacta.
- Repetir ambos cambios de estado.
- Pedido simple antiguo sin el nuevo campo: cambiar estados y comprobar que no se sobrescribe su precio.
- Entrega externa: comprobar que no cambia su comportamiento.
