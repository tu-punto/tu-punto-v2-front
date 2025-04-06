import { IBranch } from "./branchModel";
import { IProduct } from "./productModel";
import { ISeller } from "./sellerModels";

export interface IEntry {
  id_ingreso: number;
  fecha_ingreso: Date;
  estado: string;
  cantidad_ingreso: number;
  id_producto: number;
  id_sucursal: number;
  id_vendedor: number;

  producto: IProduct;
  vendedor: ISeller;
  sucursal: IBranch;
}
