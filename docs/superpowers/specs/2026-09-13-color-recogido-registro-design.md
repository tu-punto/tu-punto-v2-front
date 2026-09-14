# Color de recogido condicionado por registro

## Objetivo

Clarificar visualmente la secuencia de gestión de guías sin modificar datos ni API.

## Regla visual

- Sin recoger: punto de recogido rojo.
- Recogido sin registrar: punto de recogido amarillo.
- Recogido y registrado: ambos puntos verdes.
- Registrado sin recoger: punto de registrado verde y de recogido rojo.

El estado y filtro de registro no cambian. El cambio se limita a la tabla de encargados en frontend.

## Registros antiguos

No habrá migración de base de datos. Las guías antiguas que no posean `isRegistrado` se consideran visualmente registradas y se muestran en verde. Las nuevas guías persistirán explícitamente `isRegistrado: false`, por lo que inician rojas hasta que un encargado las marque. El filtro seguirá la misma interpretación.
