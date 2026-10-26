# Envío por flota en Lista y/o Guía

## Objetivo

Registrar si los productos de una carga se enviarán por flota y exigir los adjuntos correctos para esa decisión.

## Formulario

En el modal `Lista y/o Guía`, inmediatamente antes de `Descripción`, se mostrará la pregunta obligatoria `¿Los productos se enviarán por flota?` con las opciones exclusivas `Sí` y `No`.

- El formulario abre sin ninguna opción seleccionada.
- Hasta responder, no se muestran los campos de archivos y el formulario no puede guardarse.
- Con `Sí`, se muestran `Foto de la Guía de Envío` y `Lista de productos`; ambos son obligatorios.
- Con `No`, se muestra solo `Lista de productos`, que sigue siendo obligatoria.
- Si se cambia de `Sí` a `No`, se descarta cualquier foto seleccionada y no se envía al servidor.
- La descripción permanece opcional.

## Datos y validación

El cliente enviará `enviado_por_flota` como valor booleano dentro del formulario multipart. El backend lo validará, lo persistirá junto al registro y aplicará las mismas reglas independientemente del cliente:

- `enviado_por_flota` es obligatorio en los registros nuevos.
- Debe existir al menos un archivo `lista_productos`.
- Si `enviado_por_flota` es `true`, debe existir una imagen en `imagen`.
- Si es `false`, no se aceptará ni almacenará una imagen de guía.

Los documentos históricos que no tengan este campo se conservarán y se presentarán como `No especificado`.

## Visualización

La tabla o el detalle existente de guías expondrá el dato guardado como `Sí`, `No` o `No especificado` para registros anteriores. Esta etiqueta no sustituye los indicadores existentes de recogido o registrado.

## Errores y verificación

El frontend muestra mensajes de formulario para la respuesta pendiente, la lista ausente y, para envío por flota, la foto ausente. El backend responde con errores de validación equivalentes.

Se comprobarán los siguientes casos:

1. Apertura limpia sin una opción preseleccionada.
2. `Sí` con foto y lista: registro exitoso y valor persistido.
3. `Sí` sin foto: bloqueo en cliente y servidor.
4. `No` con lista: registro exitoso sin imagen.
5. `No` sin lista: bloqueo en cliente y servidor.
6. Cambio de `Sí` a `No`: la foto previamente elegida no se envía.
7. Registro histórico sin valor: visualización `No especificado`.
