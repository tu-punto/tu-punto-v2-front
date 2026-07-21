# Diseño: gastos recurrentes, filtro de vendedores y edición de deudas

Fecha: 2026-07-21

## Objetivo

Corregir tres comportamientos en el frontend:

- arreglar la lógica de `Gastos recurrentes` para que use categorías reales y construya correctamente el concepto
- corregir el filtro de vendedores en `Shipping` según el estado seleccionado
- permitir editar `Deuda vendedor` y `Deuda comprador` en `Paquetes del servicio` para roles autorizados

## Alcance

### 1. Gastos recurrentes

Archivo principal:

- `src/pages/FinanceFlux/RecurringExpensesModal.tsx`

Cambios:

- `TIPO` deja de funcionar como texto usado para el concepto
- `TIPO` pasa a mostrar las mismas categorías de `Gastos e Ingresos`
- si la categoría no existe, debe poder crearse desde el mismo flujo
- la categoría guardada deja de forzarse a `Servicio`
- `DETALLE` pasa a usarse para construir el concepto
- el concepto final se forma como `DETALLE` + `HASTA CUANDO SE PAGO`
- si `DETALLE` no está lleno, el concepto usa el valor seleccionado en `TIPO`

Resultado esperado:

- la categoría registrada coincide con la elegida por el usuario
- `DETALLE` deja de ser decorativo y pasa a tener efecto real

### 2. Filtro de vendedores por estado

Archivo principal:

- `src/pages/Shipping/ShippingTable.tsx`

Cambios:

- para `Todos`, `Listo para recoger`, `Para enviar a otra sucursal` y `En camino`, el filtro de vendedores debe mostrar vendedores con al menos un pedido en cualquiera de esos cuatro estados
- para `Entregados`, el filtro de vendedores debe recalcularse y mostrar solo vendedores con al menos un pedido entregado
- para los demás estados, el filtro de vendedores mantiene el universo general de los primeros cuatro estados

Resultado esperado:

- el selector de vendedores deja de ocultar vendedores que sí deberían estar disponibles en el flujo general
- al cambiar a `Entregados`, el listado se restringe correctamente a vendedores con entregas

### 3. Edición de deudas en pedidos simples

Archivo principal:

- `src/pages/Shipping/SimplePackageManagerModal.tsx`

Cambios:

- permitir edición inline de `Deuda vendedor` y `Deuda comprador` en la tabla de `Paquetes del servicio`
- habilitar esa edición solo para `operator`, `admin` y `superadmin`
- no cambiar el comportamiento actual del resto de roles
- reutilizar el flujo actual de actualización del modal para evitar duplicar persistencia

Resultado esperado:

- los roles autorizados pueden corregir ambas deudas directamente desde la tabla
- los demás comportamientos del modal permanecen iguales

## Riesgos y cuidado de implementación

- no romper el registro actual de gastos e ingresos al cambiar la construcción de `concepto` y `categoria`
- no desincronizar el filtro de vendedores con los datos cargados en la tabla
- no abrir permisos de edición a roles no autorizados en pedidos simples

## Verificación

- registrar un gasto recurrente con categoría existente y categoría nueva
- registrar un gasto con `DETALLE` lleno y otro sin `DETALLE`
- validar que el `concepto` resultante cambie según las reglas definidas
- revisar el selector de vendedores en `Todos`, `Listo para recoger`, `Para enviar a otra sucursal`, `En camino`, `Entregados` y otro estado adicional
- comprobar que `operator`, `admin` y `superadmin` pueden editar ambas deudas en pedidos simples
- comprobar que los demás roles mantienen su comportamiento actual
