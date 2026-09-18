# Resumen de cierre diario y tipo de pago Correctivo

## Objetivo

Corregir el resumen de cierre de caja cuando existen varios cierres de una sucursal en una misma fecha, incorporar la conciliacion QR equivalente y registrar ventas Correctivo como un importe separado, exclusivo del cierre de caja.

## Agrupacion del resumen

Cada fila representa una sucursal y un dia en vista diaria, o una sucursal y un mes en vista mensual.

- **Efectivo esperado** y **Efectivo real** corresponden solo al cierre mas reciente del grupo.
- **Desfase positivo**, **desfase negativo** y **neto** de efectivo suman el resultado de todos los cierres del grupo.
- QR sigue exactamente la misma regla: esperado y recibido del ultimo cierre; desfaces y neto QR acumulados.
- El importe Correctivo suma todas las ventas Correctivo registradas por los cierres del grupo.
- Los totales del pie siguen estas mismas reglas sobre las filas visibles.

El cierre mas reciente se determina por `closed_at`, con `created_at` como respaldo.

## Tipo de pago Correctivo

Se agrega `Correctivo` como quinta alternativa en los flujos de venta directa y de pedido/entrega que ya eligen tipo de pago.

Al seleccionarlo:

- Se conserva el importe de la venta en `subtotal_correctivo`.
- `subtotal_efectivo` y `subtotal_qr` se guardan en cero.
- No se modifica el estado del pedido, el pago al vendedor, sus saldos, comisiones, inventario, ni los flujos financieros existentes.
- No se incorpora a efectivo esperado, QR esperado, efectivo real ni QR recibido.

## Datos y flujo del cierre

Los pedidos y ventas almacenan `subtotal_correctivo` junto a los subtotales existentes. El historial de ventas devuelve dicho importe y el resumen diario de ventas lo expone separadamente.

Al crear o editar un cierre, se persiste `ventas_correctivo`: el total Correctivo del intervalo propio de ese cierre. Por ello varios cierres de una fecha aportan importes correctivos independientes que el panel puede sumar sin duplicarlos.

## Interfaz

- Los formularios de ventas y entregas muestran el quinto boton `Correctivo`.
- El resumen del cierre de caja muestra grupos de columnas para Efectivo y QR, y una columna `Ventas correctivas`.
- Se preservan los filtros, vista diaria/mensual y el conteo de cierres existentes.

## Compatibilidad y verificacion

Los documentos antiguos no tienen los nuevos campos y se interpretan como cero. No se requiere migracion.

- Con dos cierres de Bs. 1.000 y Bs. 2.000, la fila diaria muestra Bs. 2.000 como efectivo esperado/real, no Bs. 3.000.
- Si sus diferencias son Bs. 10 y Bs. -5, los desfaces muestran Bs. 10 positivo, Bs. 5 negativo y Bs. 5 neto.
- El mismo caso se valida para QR.
- Dos cierres que registren Bs. 30 y Bs. 40 correctivos muestran Bs. 70 en ventas correctivas, sin cambiar efectivo ni QR.
- Una venta o entrega Correctivo conserva el comportamiento de vendedor y pedido previo, con subtotales efectivo y QR en cero.
