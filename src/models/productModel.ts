import { IProduct_Branch } from "./branchModel";
import { IEntry } from "./entryModel";
import { ISale } from "./saleModel";
import { IWorker } from "./workerModel";

export interface IProduct {
  id_producto: number;
  nombre_producto: string;
  precio: number;
  fecha_de_ingreso: Date;
  imagen: string;
  id_categoria: number;
  id_vendedor: number;

  vendedor: IWorker;
  venta: ISale[];
  producto_sucursal?: IProduct_Branch[];
  ingreso?: IEntry[];

  // TODO: add missing interfaces
  //   group: IGroup;
  //   features: ICaracteristicas[];
  //   categoria: ICategoria;
}
