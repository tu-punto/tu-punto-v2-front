// TEMPORAL PRODUCTS
import { getProductByIdAPI } from "../api/product"

export const saveTempProduct = (tempProduct) => {
    const stored = JSON.parse(localStorage.getItem("newProducts") || "[]");

    const { productData, sucursales } = tempProduct;

    const productFinal = {
        _id: productData._id || crypto.randomUUID(),
        nombre_producto: productData?.nombre_producto ?? '',       // ← validar que venga
        id_vendedor: productData?.id_vendedor ?? '',               // ← validar que venga
        id_categoria: productData?.id_categoria ?? '',             // ← validar que venga
        sucursales,
        isNew: true,
    };

    localStorage.setItem("newProducts", JSON.stringify([...stored, productFinal]));
};


export const getTempProducts = () => {
    return JSON.parse(localStorage.getItem("newProducts") || "[]");
};

export const clearTempProducts = () => {
    localStorage.removeItem("newProducts");
};

// 🔸 TEMPORAL VARIANTS

export const saveTempVariant = (payload) => {
    const stored = JSON.parse(localStorage.getItem("newVariants") || "[]");

    const newVariant = {
        product: {
            ...payload.product,
            _id: payload.product._id || crypto.randomUUID(),
        },
        sucursalId: payload.sucursalId,
        combinaciones: payload.combinaciones,
        isNew: true,
    };

    localStorage.setItem("newVariants", JSON.stringify([...stored, newVariant]));
};

export const getTempVariants = () => {
    return JSON.parse(localStorage.getItem("newVariants") || "[]");
};

export const clearTempVariants = () => {
    localStorage.removeItem("newVariants");
};

// TEMPORAL STOCK

export const saveTempStock = (stockArray) => {
    localStorage.setItem("newStock", JSON.stringify(stockArray));
};

export const getTempStock = () => {
    return JSON.parse(localStorage.getItem("newStock") || "[]");
};

export const clearTempStock = () => {
    localStorage.removeItem("newStock");
};


export const reconstructProductFromFlat = ({ flatProducts, productId, sucursalId }) => {
    console.log("🧪 reconstructProductFromFlat → flatProducts:", flatProducts);
    console.log("🧪 reconstructProductFromFlat → productId:", productId);
    console.log("🧪 reconstructProductFromFlat → sucursalId:", sucursalId);

    // 1. Buscar producto con estructura completa (con sucursales)
    const productWithSucursales = flatProducts.find(p =>
        p._id === productId &&
        Array.isArray(p.sucursales) &&
        p.sucursales.some(s => s.id_sucursal === sucursalId)
    );

    if (productWithSucursales) {
        const sucursal = productWithSucursales.sucursales.find(s => s.id_sucursal === sucursalId);
        return {
            ...productWithSucursales,
            sucursales: [sucursal]
        };
    }

    // 2. Si no existe estructura con sucursales → reconstruir desde productos flat
    const productosFiltrados = flatProducts.filter(p => p._id === productId);

    if (productosFiltrados.length === 0) {
        console.warn("⚠️ No se encontró producto base");
        return null;
    }

    const base = productosFiltrados[0];

    const combinaciones = productosFiltrados
        .filter(p => p.sucursalId === sucursalId)
        .map(p => ({
            variantes: p.variantes_obj || {},
            precio: p.precio,
            stock: p.stock,
        }));

    const sucursalObj = {
        id_sucursal: sucursalId,
        combinaciones
    };

    const productoReconstruido = {
        _id: base._id,
        nombre_producto: base.nombre_producto,
        id_vendedor: base.id_vendedor,
        id_categoria: base.id_categoria,
        sucursales: [sucursalObj]
    };

    console.log("✅ Producto reconstruido:", productoReconstruido);
    return productoReconstruido;
};


export const fetchFullProductById = async (productId: string) => {
    try {
        const product = await getProductByIdAPI(productId);
        return product;
    } catch (error) {
        console.error("❌ Error al obtener producto completo:", error);
        return null;
    }
};




