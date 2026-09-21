# Carga de ventas y textos QR en cierre de caja

## Problema

El formulario de cierre consulta el historial de ventas, cuyo endpoint devuelve `totales_cierre` directamente. El cliente esperaba indebidamente un campo `success`, por lo que ignoraba efectivo, QR y Correctivo y los mostraba en cero. Algunas etiquetas QR tienen texto UTF-8 mal codificado.

## Cambio

- Leer `totales_cierre` o `totales` cuando la respuesta exista, sin exigir `success`.
- Mantener los ceros solo cuando no haya respuesta o los importes no sean numericos.
- Corregir las etiquetas afectadas: "Conciliacion QR" y "Ventas QR del dia".

## Garantias y verificacion

No se cambia el intervalo desde el ultimo cierre ni las formulas de efectivo, QR o Correctivo. Con una respuesta que contenga efectivo, QR y correctivo, los tres valores se reflejan en el formulario y se persisten al guardar el cierre.
