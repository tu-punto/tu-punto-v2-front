import { IEntry } from "./entryModel";
import { IProduct } from "./productModel";
import { Shipping } from "./shippingModel";
import { ISale } from "./saleModel";
import { IWorker } from "./workerModel";

export interface ISeller {
  id_vendedor: number;
  marca: string;
  nombre: string;
  apellido: string;
  telefono: number;
  carnet: number;
  direccion: string;
  mail: string;
  alquiler: number;
  exhibicion: number;
  delivery: number;
  adelanto_servicio: number;
  comision_porcentual: number;
  comision_fija: number;
  fecha: Date;
  fecha_vigencia: Date;
  almacen_caja: number;
  emite_factura: boolean;
  deuda: number;
  //TODO QUITAR LOS NULLS DE ID_TRABAJADOR Y DE TRABAJADOR
  id_trabajador: number;

  // TODO: add missing interfaces
  //   user: IUser;
  //   comprobante_entrada?: IComprobanteEntrada[];
  //   comprobante_pago?: IComprobantePago[];
  //   flujoFinanciero?: IFlujoFinanciero[];
  trabajador: IWorker;
  pedido?: Shipping[];
  producto?: IProduct[];
  venta: ISale[];
  ingreso?: IEntry[];
}
