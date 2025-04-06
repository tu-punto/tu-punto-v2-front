import { IBranch } from "./branchModel";
import { ISeller } from "./sellerModels";
import { Shipping } from "./shippingModel";

export interface IWorker {
  id_trabajador: number;
  nombre: string;
  numero: number;
  rol: string;
  estado: string;

  vendedor?: ISeller[];
  pedido?: Shipping[];
  sucursal: IBranch[];
  //   TODO: add missing interfaces
  //   flujoFinanciero?: IFlujoFinanciero[];
  //   user: IUser;
}
