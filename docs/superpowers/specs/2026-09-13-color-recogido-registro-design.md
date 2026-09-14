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

No habrá migración de base de datos. Las guías antiguas que no posean `isRegistrado` se interpretan a partir de su estado histórico `isRecogido`: si fue recogida, ambos indicadores se muestran como registrados/recogidos en verde; si no fue recogida, ambos se muestran rojos. Los filtros siguen esta misma interpretación. Las nuevas guías persistirán explícitamente `isRegistrado: false`, por lo que conservan la secuencia rojo, amarillo y verde definida arriba.
