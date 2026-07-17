import { IBoxClose } from "./boxClose";
import { IEntry } from "./entryModel";
import { IProduct } from "./productModel";
import { Shipping } from "./shippingModel";
import { IWorker } from "./workerModel";


export interface IBranch {
  _id?:string;
  id_sucursal: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: number;
  pickup_schedule_weekdays_open_time?: string;
  pickup_schedule_weekdays_close_time?: string;
  pickup_schedule_saturday_open_time?: string;
  pickup_schedule_saturday_close_time?: string;
  delivery_cutoff_enabled?: boolean;
  delivery_cutoff_weekdays_registration_time?: string;
  delivery_cutoff_weekdays_closing_time?: string;
  delivery_cutoff_saturday_registration_time?: string;
  delivery_cutoff_saturday_closing_time?: string;
  delivery_cutoff_sunday_registration_time?: string;
  delivery_cutoff_sunday_closing_time?: string;
  delivery_cutoff_start_time?: string;
  delivery_cutoff_end_time?: string;
  delivery_cutoff_time?: string;
  imagen_header?: string;

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
