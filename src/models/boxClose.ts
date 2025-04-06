import { IBranch } from "./branchModel";
import { IDailyEffective } from "./dailyEffective";

export interface IBoxClose {
  id_cierre_caja: number;
  responsible: string;
  ventas_efectivo: number;
  ventas_qr: number;
  efectivo_inicial: number;
  bancario_inicial: number;
  ingresos_efectivo: number;
  efectivo_esperado: number;
  efectivo_real: number;
  bancario_esperado: number;
  bancario_real: number;
  diferencia_efectivo: number;
  diferencia_bancario: number;
  observaciones: string;
  created_at: string;
  updated_at: string;
  id_efectivo_diario: IDailyEffective;
  id_sucursal: IBranch;
}
