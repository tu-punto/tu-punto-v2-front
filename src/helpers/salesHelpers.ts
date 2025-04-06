import { getProductsBySellerIdAPI } from "../api/sales";

export const getSellerProductsById = async (sellerId: number) => {
    const res = await getProductsBySellerIdAPI(sellerId);
    // if (res?.status !== 200) {
    //     message.error(`Fail to get products by seller with id ${sellerId}`);
    //     return 0;
    // }
    const productos = Array.isArray(res) ? res : [];
    const productosConTipo = productos.map((product: any) => {
        return {
            ...product,
            key: `${product.id_producto}-${product.fecha_pedido}`,
        };
    });
    return productosConTipo;
};
