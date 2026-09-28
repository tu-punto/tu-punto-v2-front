# Área segura del menú inferior móvil

## Problema

El menú inferior móvil aplica el espacio seguro inferior tanto en su contenedor fijo como en su contenido. El contenedor exterior no define el fondo azul del menú, por lo que en dispositivos con área segura aparece una franja blanca debajo de las opciones.

## Cambio

- El contenedor fijo será el único responsable del `safe-area-inset-bottom` y tendrá el fondo azul existente del menú.
- El contenido interno dejará de añadir padding inferior propio.

## Garantías y verificación

No cambian rutas, iconos, etiquetas, selección activa, menú "Más" ni la altura de las opciones. En móvil, la barra permanecerá fija y el fondo azul cubrirá el área segura hasta el borde inferior, tanto con el menú "Más" cerrado como abierto.
