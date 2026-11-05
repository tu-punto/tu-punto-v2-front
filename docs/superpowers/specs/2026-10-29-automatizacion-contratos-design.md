# Automatización de contratos y documentos del vendedor

## Objetivo

Permitir que el personal administre documentos contractuales versionados, genere una Orden de Servicio en Word y descargue un paquete contractual en PDF para cada vendedor. También debe poder preparar el envío manual de documentos al chat del vendedor.

## Documentos administrables

Se agregará para administradores una sección `Documentos contractuales`. Cada documento tendrá nombre, tipo, versión o fecha, estado vigente y un origen único: archivo cargado o enlace HTTPS.

Los tipos son: Contrato Marco, Orden de Servicio (plantilla), Anexo 4 / Productos prohibidos, Políticas y Tarifario. El historial permanece disponible, pero solo una versión por tipo puede estar vigente. Al reemplazar un documento no se alteran documentos ya generados.

## Botones en la ficha del vendedor

Junto a `Cobro recuperación` se agregarán los siguientes botones para usuarios no vendedores autorizados:

1. `Generar contrato`: solicita ciudad y fecha de firma. Genera y descarga un PDF único con el Contrato Marco completado, la Orden de Servicio generada y el Anexo 4 vigente.
2. `Enviar documentos`: permite marcar Políticas, Tarifario y Productos prohibidos. Abre el chat del vendedor con los adjuntos seleccionados preparados en el compositor; el usuario debe confirmar el envío manualmente.
3. `Orden de servicio`: solicita fecha de activación, promoción o descuento y vigencia de promoción. Genera y descarga solamente la Orden de Servicio en formato Word.

Si falta una versión vigente de un documento requerido, el botón correspondiente informa qué documento debe configurarse y no genera contenido incompleto.

## Orden de Servicio

Se utilizará una plantilla Word gestionada en el backend. La salida contendrá los datos registrados del vendedor: nombre o razón social, C.I./NIT, domicilio, ciudad o zona, correo y WhatsApp, más la fecha de activación indicada.

La tabla de plan y capacidad incluirá únicamente las sucursales activas del vendedor a la fecha de generación. Para cada una se mostrarán las tarifas configuradas de Almacenamiento, Exhibición y Entrega simple. Se considera activa una sucursal cuyo vínculo no haya finalizado y cuyo vendedor permanezca vigente.

La Orden puede incluir las herramientas de cobro `Efectivo`, `QR/transferencia` y `Mixto`. Solo figuran las herramientas activadas para el vendedor, con su tarifa fija. La promoción se representa como no aplicable o con su beneficio y el intervalo solicitado. La vigencia posterior aclara que rige la tarifa regular vigente.

Las versiones de Políticas Operativas y Tarifario se toman de los documentos vigentes administrados, no de texto libre. La aceptación conserva las versiones usadas.

## Generación y trazabilidad

El backend construirá la Orden de Servicio desde una plantilla DOCX y sus datos validados. Para `Generar contrato`, completará el Contrato Marco, convertirá los documentos Word a PDF y unirá, en este orden: Contrato Marco, Orden de Servicio, Anexo 4. El resultado se almacena de forma privada y se registra con el vendedor, operador, fecha, entradas suministradas y versiones documentales utilizadas.

## Seguridad y validación

- Solo roles administrativos autorizados gestionan documentos, generan contratos y preparan adjuntos.
- Los archivos admitidos se validan por tipo y tamaño; los enlaces deben ser HTTPS.
- Ciudad, fecha de firma, fecha de activación y campos de promoción son obligatorios cuando aplican.
- Las URLs de resultados y adjuntos serán firmadas o privadas.
- La preparación de chat nunca envía mensajes por sí sola.

## Verificación

1. Un admin publica versiones de Políticas y Tarifario y las versiones aparecen en la Orden.
2. Una Orden solo lista sucursales activas y sus tres tarifas.
3. Cada herramienta de cobro seleccionada aparece con su tarifa fija; las no activas no aparecen.
4. La Orden se descarga como DOCX con todos los campos resueltos.
5. El contrato produce un PDF combinado con el orden correcto y trazabilidad de versiones.
6. El selector de envío abre el chat con adjuntos, sin transmitirlos automáticamente.
7. Roles no autorizados no pueden administrar ni generar documentos.
