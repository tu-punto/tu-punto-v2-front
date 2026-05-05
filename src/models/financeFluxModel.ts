export interface FinanceFlux {
  id_flujo_financiero: number | null;
  tipo: string;
  categoria: string;
  concepto: string;
  monto: number;
  fecha: Date;
  //TODO: implemente vendedor and trabajador interfaces
  vendedor: any;
  trabajador: any;
  esDeuda: boolean;
  descuento_porcentaje?: number;
  monto_sin_descuento?: number;
  detalle_servicios?: {
    id_sucursal?: any;
    sucursalName: string;
    alquiler: number;
    exhibicion: number;
    entrega_simple: number;
    delivery: number;
    total: number;
  }[];
}
