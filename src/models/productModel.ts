
import { IWorker } from "./workerModel";
import { ISale } from "./saleModel";
import { IEntry } from "./entryModel";

export interface IVariante {
  nombre_variante: string;
  precio: number;
  stock: number;
}

export interface ISucursalProducto {
  id_sucursal: string; // ObjectId como string
  variantes: IVariante[];
}

export interface IProduct {
  _id?: string;
  nombre_producto: string;
  precio: number;
  fecha_de_ingreso: Date;
  imagen: string;
  id_categoria: string;
  id_vendedor: string;
  groupId: number;

  vendedor: IWorker;
  //categoria: ICategoria;
  //group: IGroup;
  //features: ICaracteristica[];

  venta: ISale[]; // O string[] si no populas
  ingreso?: IEntry[]; // O string[] si no populas

  sucursales: ISucursalProducto[];
}
