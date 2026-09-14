# Vista de guías y listas para encargados

## Objetivo

Hacer operativa la tabla de guías y listas para los roles `admin`, `superadmin` y `operator`, sin cambiar la vista de vendedores.

## Alcance aprobado

La tabla de encargados mostrará las columnas, en este orden:

1. Fecha de creación y hora.
2. Vendedor.
3. ¿Recogido o recibido?: indicador circular verde o rojo basado en `isRecogido`.
4. Acciones de guía: abrir el archivo de guía y marcarla como recogida/recibida.
5. ¿Registrado?: indicador verde cuando existe al menos un elemento en `lista_productos_keys`, rojo cuando no existe.
6. Acciones de lista: abrir la lista, marcarla como recogida/recibida y abrir el comentario.

La descripción de cada registro estará visible en los modales de apertura de la guía y de la lista. La lista de archivos seguirá usando URLs firmadas; la vista debe soportar imagen, PDF y otros formatos como hoy.

## Roles y datos

La experiencia ampliada aplica solo a `admin`, `superadmin` y `operator`. Los vendedores continúan usando las columnas, acciones y filtros actuales.

`Registrado` es un estado derivado, no persistido: representa que la lista fue subida. Se calcula a partir de `lista_productos_keys`. La carga actual exige una lista de productos, por lo que normalmente los registros nuevos se verán como registrados; el estado rojo cubre datos históricos o incompletos.

No se agrega un estado independiente ni cambios al backend para `Registrado`.

## Filtros

En la vista de encargados habrá:

- Un filtro de un toque para alternar todos, recogidos y pendientes de recoger.
- Un filtro de un toque para alternar todos, registrados y no registrados.
- Un campo de búsqueda por nombre completo de vendedor/cliente.

Los filtros se combinan entre sí y con la ordenación descendente predeterminada por fecha de creación.

## Comportamiento y errores

- Los botones que no tengan archivo asociado no se mostrarán o estarán deshabilitados con una explicación breve.
- Al marcar recogido, la fila se actualizará de forma local tras confirmar la respuesta exitosa, conservando los mensajes de éxito y error existentes.
- Los modales de archivo mostrarán carga, estado vacío y error, además de la descripción.
- No se alteran rutas ni contratos existentes del backend.

## Verificación

- Construcción y lint del frontend.
- Revisión manual de la tabla para roles de encargado y vendedor.
- Prueba de combinaciones de ambos filtros y búsqueda.
- Prueba de apertura de guía/lista, comentarios y marcado de recogido.
