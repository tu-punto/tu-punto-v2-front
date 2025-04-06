import { IProduct } from "./productModel";
import { ISeller } from "./sellerModels";
import { Shipping } from "./shippingModel";

export interface ISale {
  id_venta: number;
  id_pedido: number;
  id_vendedor: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  utilidad: number;
  deposito_realizado: boolean;

  producto: IProduct;
  pedido: Shipping;
  vendedor: ISeller;
}
