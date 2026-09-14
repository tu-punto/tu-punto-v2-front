# Fechas de creación y recojo en entregas

## Objetivo

Mostrar en los formularios de detalle de entregas la fecha en que se creó la entrega y, cuando aplique, la fecha en que fue recogida. El cambio es solamente visual y no modifica la API ni la persistencia.

## Datos y reglas

- La fecha de creación proviene del campo existente `fecha_pedido`.
- La fecha de recojo proviene del campo existente `hora_entrega_real`.
- La fecha de recojo se muestra únicamente cuando `hora_entrega_real` tenga valor.
- Ambas fechas se formatean en la zona horaria `America/La_Paz` como `DD/MM/YYYY · HH:mm`.
- No habrá migraciones, campos nuevos ni cambios de payload.

## Interfaz

Se agregará un bloque de metadatos compacto inmediatamente antes de la información del vendedor. Tendrá iconos discretos, texto secundario y una separación visual tenue para que acompañe al formulario sin competir con sus campos principales.

El mismo patrón se aplicará a los detalles de entregas externas y simples; el detalle de stock usará el componente de entrega correspondiente y conservará exactamente las mismas reglas de datos y visibilidad.

## Verificación

- Entrega externa no recogida: solo muestra la fecha de creación.
- Entrega externa recogida: muestra creación y recojo.
- Entrega simple no recogida y recogida: respeta las mismas reglas.
- Entrega de stock: muestra las fechas disponibles sin alterar su flujo actual.
