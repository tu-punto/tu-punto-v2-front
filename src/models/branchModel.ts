import { IBoxClose } from "./boxClose";
import { IEntry } from "./entryModel";
import { IProduct } from "./productModel";
import { Shipping } from "./shippingModel";
import { IWorker } from "./workerModel";


export interface IBranch {
  id_sucursal: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: number;

  producto_sucursal?: IProduct_Branch[];
  pedido?: Shipping;
  trabajador: IWorker[];
  ingreso?: IEntry[];
  cierre_caja: IBoxClose[];
}
export interface IProduct_Branch {
  //las dos primeras afk
  id_producto: number;
  id_sucursal: number;
  cantidad_por_sucursal: number;
  numero_caja: number;

  producto: IProduct;
  sucursal: IBranch;
}
