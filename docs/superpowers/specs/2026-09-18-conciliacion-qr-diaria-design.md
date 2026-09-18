# Conciliacion QR diaria en cierre de caja

## Objetivo

Permitir que cada cierre de caja confronte el dinero QR recibido durante esa fecha con el importe QR que deberia haberse recibido ese mismo dia. La conciliacion QR no debe transportar ni sumar saldos de cierres anteriores.

## Alcance

- Se conserva sin cambios el recuento, los calculos y los campos de efectivo.
- Se reutilizan los campos QR ya persistidos por el cierre: ventas QR, esperado QR, real QR y diferencia QR.
- La interfaz deja de presentar el concepto de saldo QR inicial.

## Calculo

Para la fecha del cierre:

```
QR esperado = ventas QR del dia
              + operaciones adicionales QR de ingreso
              - operaciones adicionales QR de gasto

Diferencia QR = QR recibido hoy - QR esperado
```

`QR recibido hoy` es un unico importe que el usuario ingresa manualmente. No se toma ningun importe del ultimo cierre ni de un saldo bancario inicial.

## Interfaz y flujo

1. El resumen de ventas muestra las ventas QR detectadas para el dia.
2. La seccion "Conciliacion QR" muestra QR esperado (solo lectura), QR recibido hoy (editable) y diferencia QR (solo lectura).
3. Al agregar o eliminar una operacion adicional QR, se recalculan QR esperado y diferencia QR de inmediato.
4. Al crear el cierre se guardan los cuatro importes QR, incluido el valor ingresado para el dia.
5. Al editar o consultar un cierre se cargan los importes guardados, sin reconstruir ni acumular QR desde otros dias.

## Compatibilidad y riesgos

Los documentos historicos conservan los mismos nombres de campo, por lo que no requieren migracion. El cambio se concentra en el formulario de cierre. Las formulas de efectivo continuan usando exclusivamente efectivo inicial, ventas en efectivo y operaciones adicionales de efectivo; no se alteran.

## Verificacion

- Un cierre con ventas QR de Bs. 100, ingreso QR adicional de Bs. 20 y gasto QR de Bs. 5 debe esperar Bs. 115.
- Si se ingresan Bs. 110 como QR recibido hoy, la diferencia debe ser Bs. -5.
- Un cierre posterior debe iniciar su esperado QR solo con los movimientos QR de su propia fecha.
- Los totales de efectivo deben mantenerse iguales antes y despues del cambio con los mismos datos de efectivo.
