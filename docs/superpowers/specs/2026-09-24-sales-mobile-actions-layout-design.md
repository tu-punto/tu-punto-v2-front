# Acciones del carrito en móvil

## Problema

En la cabecera del carrito, los botones "Historial de Ventas" y "Promociones Vendedores" comparten una fila con el título. En anchos de celular, esa fila no tiene espacio suficiente y las acciones pueden desbordarse, dejando una composición con espacio desaprovechado.

## Cambio

- En pantallas pequeñas, agrupar las acciones en una columna: primero "Historial de Ventas" y debajo "Promociones Vendedores".
- Mantener los mismos destinos y el `sellerId` seleccionado al abrir promociones.
- A partir del breakpoint medio, conservar la fila horizontal actual para no alterar escritorio o tablet.

## Garantías y verificación

No cambian permisos, navegación ni texto de las acciones. Se verificará que ambas acciones sean visibles y pulsables en una vista móvil, y que continúen alineadas horizontalmente desde el breakpoint medio.
