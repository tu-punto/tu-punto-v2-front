// TEMPORAL PRODUCTS

export const saveTempProduct = (tempProduct) => {
    const stored = JSON.parse(localStorage.getItem("newProducts") || "[]");

    const { productData, sucursales } = tempProduct;

    const productFinal = {
        _id: productData._id || crypto.randomUUID(),
        nombre_producto: productData.nombre_producto,
        id_vendedor: productData.id_vendedor,
        id_categoria: productData.id_categoria,
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
