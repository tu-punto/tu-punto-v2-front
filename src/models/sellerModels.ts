import { IEntry } from "./entryModel";
import { IProduct } from "./productModel";
import { Shipping } from "./shippingModel";
import { ISale } from "./saleModel";
import { IWorker } from "./workerModel";

// ✅ Definimos la estructura del array
export interface ISucursalPago {
  id_sucursal: string; // o number si usás otro tipo
  sucursalName: string;
  alquiler: number;
  exhibicion: number;
  delivery: number;
  entrega_simple: number;
}

export interface ISeller {
  _id: string;
  marca: string;
  nombre: string;
  apellido: string;
  telefono: number;
  carnet: number;
  direccion: string;
  mail: string;

  // alquiler: number;
  // exhibicion: number;
  // delivery: number;
  // entrega_simple: number;

  pago_sucursales: ISucursalPago[];

  comision_porcentual: number;
  comision_fija: number;
  fecha: Date | string;
  fecha_vigencia: Date | string;
  almacen_caja: number;
  emite_factura: boolean;
  deuda: number;
  id_trabajador: number;

  trabajador: IWorker;
  pedido?: Shipping[];
  producto?: IProduct[];
  venta: ISale[];
  ingreso?: IEntry[];
}
