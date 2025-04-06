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
}
