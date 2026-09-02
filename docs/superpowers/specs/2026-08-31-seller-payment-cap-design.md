# Diseño: límite global para solicitudes de pago de vendedores

## Objetivo

Evitar que los compromisos de pago a vendedores superen el efectivo disponible. Un superadmin configura un único límite real en bolivianos; ese mismo límite se aplica de forma independiente a cada fecha de pago regular: 8, 18 y 28.

## Configuración y permisos

- Solo `superadmin` puede leer o cambiar el límite real.
- La entrada a la configuración estará en la página **Lista de vendedores**, como un botón visible únicamente para superadmin que abre un modal.
- El modal permite guardar un límite real no negativo y muestra, por cada próxima fecha con solicitudes, su total real reservado y cupo restante.
- La configuración se persiste en MongoDB como documento singleton; si todavía no existe, el límite efectivo será ilimitado para no bloquear el flujo histórico.

## Visibilidad para vendedores

- El límite real no se incluye en respuestas destinadas al vendedor.
- Al vendedor se le presenta un límite visual igual a `límite real + Bs. 20.000` y un cupo visual calculado contra ese mismo límite visual.
- El bloque se ubica en el modal de solicitud de pago e indica que la fecha se asigna automáticamente según la disponibilidad.
- Al completar la solicitud, el mensaje confirma la fecha asignada.

## Asignación automática

1. Al recibir una solicitud, el backend obtiene el pago pendiente actual del solicitante y recalcula los pagos pendientes actuales de todos los vendedores con solicitudes activas.
2. Genera en orden las fechas futuras 8, 18, 28, 8, 18, 28, incluyendo meses posteriores.
3. Para cada fecha suma los pagos pendientes actuales de los vendedores ya asignados a ella. Si el total más el pago pendiente actual del solicitante no supera el límite real, asigna esa fecha.
4. Si no cabe, continúa con la siguiente fecha hasta encontrar cupo.
5. La reserva no guarda un monto fijo: toda nueva solicitud usa los saldos y deudas vigentes en ese instante.

La comprobación y actualización ocurren de forma atómica en backend para que solicitudes concurrentes no reserven el mismo cupo. Si no se puede completar por concurrencia, se vuelve a calcular y se intenta la siguiente fecha disponible.

## Datos y API

- Se añade una configuración singleton de límite de pagos a vendedores, protegida con rutas de superadmin para lectura y actualización.
- Se añade una consulta de disponibilidad segura para el vendedor, que devuelve exclusivamente montos visuales y próximas fechas disponibles.
- La solicitud existente conserva su endpoint; el backend sustituye la asignación fija de “próximo 8/18/28” por el cálculo de cupo.
- Las respuestas administrativas incluyen importes reales necesarios para el modal de superadmin.

## Filtro dinámico de fecha de pago

- La tabla de vendedores obtiene del backend qué días de pago tienen al menos una solicitud activa.
- El selector siempre conserva `Fecha pago: todos` y `Sin solicitud`.
- Las opciones `Día 8`, `Día 18` y `Día 28` solo aparecen cuando existe al menos un vendedor con solicitud activa asignada a ese día, sin importar el mes de la fecha.
- Al registrar un pago, el flujo existente elimina la solicitud y fecha asignada; por ello, una opción desaparece automáticamente si era la última solicitud de ese día.

## Casos de error y pruebas

- Rechazar límites negativos, no numéricos o no finitos.
- Mantener el requisito actual de QR antes de registrar la solicitud.
- Probar asignación dentro del cupo, salto entre 8/18/28, salto de mes y múltiples meses llenos.
- Probar el recálculo con ventas/deudas cambiadas desde solicitudes anteriores.
- Probar dos solicitudes concurrentes cercanas al límite.
- Probar que vendedor no recibe el límite real, y que el filtro oculta días sin solicitudes activas.
