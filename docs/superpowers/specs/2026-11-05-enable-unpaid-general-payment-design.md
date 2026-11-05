# Habilitar el pago general "No pagado"

## Objetivo

Permitir que el usuario aplique el estado de pago general "No pagado" a los paquetes editables del vendedor seleccionado.

## Alcance

- El botón reutilizará `applyGeneralPaymentMethod("")`, que ya actualiza de forma optimista y persiste `esta_pagado: "no"` y `metodo_pago: ""`.
- Estará disponible solamente cuando exista al menos un paquete editable y no haya una actualización general en curso, igual que los botones Efectivo y QR.
- No se cambia el cálculo inicial de `generalPaymentMethod`: si no hay método registrado, sigue interpretándose como Efectivo. Por tanto, "No pagado" no se selecciona automáticamente.

## Verificación

- Confirmar que el botón está habilitado cuando haya paquetes editables.
- Pulsarlo y comprobar que los paquetes editables quedan sin método de pago.
- Confirmar que los paquetes bloqueados no se alteran y que el botón se deshabilita durante el guardado.
