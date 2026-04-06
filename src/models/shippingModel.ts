import { IBranch } from "./branchModel";
import { ISale } from "./saleModel";
import { IWorker } from "./workerModel";

export interface Shipping {
  id_pedido: string;
  cliente: string;
  telefono_cliente: number;
  carnet_cliente?: string;
  tipo_de_pago: string;
  fecha_pedido: Date;
  hora_entrega_acordada: Date;
  hora_entrega_real: Date;
  observaciones: string;
  tipo_destino?: "sucursal" | "otro_lugar";
  lugar_entrega: string;
  ubicacion_link?: string;
  costo_delivery: number;
  cargo_delivery: number;
  estado_pedido: string;
  adelanto_cliente: number;
  pagado_al_vendedor: boolean;
  subtotal_qr: number;
  subtotal_efectivo: number;
  id_trabajador: number;
  id_sucursal: number;
  venta: ISale[];
  sucursal: IBranch[];
  trabajador: IWorker;
}
