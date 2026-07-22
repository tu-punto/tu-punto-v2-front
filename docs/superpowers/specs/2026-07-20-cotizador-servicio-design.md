# Diseño: ajustes del cotizador del servicio

Fecha: 2026-07-20

## Objetivo

Ajustar el cotizador del servicio en la pantalla de sucursales para:

- cambiar el mínimo aplicado a `PROFUNDIDAD` en la fórmula, de `40` a `30`
- ocultar la fórmula visible por defecto
- mostrar la fórmula y aclaraciones dentro de un `Popover` activado desde un ícono de información

## Alcance

### Comportamiento

La fórmula pasa de:

`(if([ALTO]>180,180,[ALTO]) * [ANCHO] * if([PROFUNDIDAD]<40,40,[PROFUNDIDAD])) * 169 / (100 * 25 * 30)`

a:

`(if([ALTO]>180,180,[ALTO]) * [ANCHO] * if([PROFUNDIDAD]<30,30,[PROFUNDIDAD])) * 169 / (100 * 25 * 30)`

Cambios explícitamente fuera de alcance:

- no se modifica la lógica de `ANCHO`
- no se modifica el tope de `ALTO` en el input, que sigue siendo `250`
- no se cambia el parámetro `169`

### Interfaz

Se reemplaza el bloque de texto donde hoy se ve la fórmula por una línea breve de ayuda con un ícono de información.

Al pasar el mouse por el ícono se muestra un `Popover` con:

- la nueva fórmula
- `Si el ancho es menor a 30 cm el precio ya no varía`
- `Si el alto es mayor a 180 no varía y no puede ser mayor a 250 cm`
- `El precio parámetro es 169 Bs`

## Componentes afectados

- `src/pages/Branch/BranchPage.tsx`

## Manejo de estados y UX

- el cálculo mensual debe seguir reaccionando en tiempo real al cambiar inputs
- el `Popover` debe verse limpio y legible dentro del modal
- en mobile no debe romper el layout del modal

## Verificación

- ingresar profundidades menores a `30` y confirmar que el resultado sea el mismo que con `30`
- ingresar profundidad `30` y mayores para validar que el cálculo siga variando normalmente
- verificar que la fórmula ya no aparezca visible de entrada
- verificar que el `Popover` muestre la fórmula nueva y las tres aclaraciones
