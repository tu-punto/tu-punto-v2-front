import { message } from "antd"
import { addProductFeaturesAPI, addProductStockAPI, registerProductAPI, registerVariantAPI } from "../api/product"

export const createVariant = async (newVariant) => {
    const { product, featuresFilter: features } = newVariant
    const stock = {
        cantidad_por_sucursal: product.stock,
        //TODO Add Sucursal Field in the form
        id_sucursal: 3
    }

    const response = await registerVariantAPI({ product, stock })
    const { newProduct } = response
    await addProductFeaturesAPI({ productId: newProduct.id_producto, features })
}

const createProductFeatures = async (products: any, features: any) => {
    const promises = products.map((product: any) => {
        const id_producto = product.id_producto
        const productFeatures: any = features.get(id_producto)
        return addProductFeaturesAPI({
            productId: id_producto, features: productFeatures
        })
    });

    return await Promise.all(promises)
}

const createProductStock = async (products: any, stockProducts: any, shippingId: any) => {

    const productsWithStock: any = []
    stockProducts.forEach((stockProduct: any) => {
        const matchedProduct = products.find((prod: any) =>
            prod.nombre_producto == stockProduct.nombre_producto
        )
        if (matchedProduct) {
            const productToAdd = {
                id_producto: matchedProduct.id_producto,
                cantidad_por_sucursal: stockProduct.stock
            }
            productsWithStock.push(productToAdd)
        }
    })

    const data = { branch: shippingId, products: productsWithStock }
    return await addProductStockAPI(data)
}

export const getProductsFromGroup = (productData, combinations, selectedFeatures, features) => {
    const realCombinations = combinations
        .filter((combination: any) => combination.price !== 0 || combination.stock !== 0)

    const productVariants = realCombinations.map((combination: any, index: number) => {
        const featureValues = selectedFeatures.map((featureId: any) => {
            const feature = features.find((f: any) => f.id_caracteristicas.toString() == featureId).feature
            return {
                feature: feature,
                value: combination[featureId.toString()]
            }
        })

        const joinedFeatureValues = featureValues.map(f => f.value).join(' ')

        return {
            "nombre_producto": `${productData.nombre_producto} ${joinedFeatureValues}`,
            "precio": combination.price,
            "imagen": '',
            "cantidad_por_sucursal": combination.stock,
            "id_categoria": productData.id_categoria,
            "id_vendedor": productData.id_vendedor,
            "id_variant": index,
        }
    })
    return productVariants
}

export const createProductsFromGroup = async (productData, combinations, selectedFeatures, features) => {
    const realCombinations = combinations
        .filter((combination: any) => combination.price !== 0 || combination.stock !== 0)

    const productVariants = realCombinations.map((combination: any, index: number) => {
        const featureValues = selectedFeatures.map((featureId: any) => {
            const feature = features.find((f: any) => f.id_caracteristicas.toString() == featureId).feature
            return {
                feature: feature,
                value: combination[featureId.toString()]
            }
        })

        const joinedFeatureValues = featureValues.map(f => f.value).join(' ')

        return {
            "nombre_producto": `${productData.nombre_producto} ${joinedFeatureValues}`,
            "precio": combination.price,
            "imagen": '',
            "cantidad_por_sucursal": combination.stock,
            "id_categoria": productData.id_categoria,
            "id_vendedor": productData.id_vendedor,
            "id_variant": index,
        }
    })

    const formattedProductData = {
        "group": productData.nombre_producto,
        "variants": productVariants,
        "id_sucursal": productData.sucursal
    }
    const res = await registerProductAPI(formattedProductData)
    res.products = res.products.map((product) => product.newProduct)
    if (res.products) {
        message.success('Producto registrado con variantes')

        const productFeaturesMap = new Map();

        realCombinations.forEach((combination: any) => {
            const featuresForProduct = selectedFeatures.map((featureId: any) => {
                const feature = features.find((f: any) => f.id_caracteristicas.toString() == featureId);
                return {
                    feature: feature?.feature,
                    value: combination[featureId.toString()]
                };
            });
            const productId = res.products.find((p: any) => p.nombre_producto.includes(`${productData.nombre_producto} ${featuresForProduct.map(f => f.value).join(' ')}`)).id_producto;

            if (!productFeaturesMap.has(productId)) {
                productFeaturesMap.set(productId, [])
            }

            productFeaturesMap.get(productId).push(...featuresForProduct)
        })

        const products = await createProductStock(res.products, productVariants, productData.sucursal)
        await createProductFeatures(res.products, productFeaturesMap)
        console.log("New Producst", products)
    } else {
        message.error('Error al crear los productos, inténtelo de nuevo')
    }
}
