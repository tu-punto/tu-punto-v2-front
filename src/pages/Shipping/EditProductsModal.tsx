import { Modal, Button, Select, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import EmptySalesTable from '../Sales/EmptySalesTable';
import ProductSellerViewModal from "../Seller/ProductSellerViewModal.tsx";
import {
    deleteProductsByShippingAPI,
    updateProductsByShippingAPI
} from '../../api/sales';
import {
    registerSalesToShippingAPI
} from '../../api/shipping';

import {registerProductAPI, updateSubvariantStockAPI} from "../../api/product.ts";
interface EditProductsModalProps {
    visible: boolean;
    onCancel: () => void;
    products: any[];
    setProducts: (updater: any) => void;
    allProducts: any[];
    sellers: any[];
    isAdmin?: boolean;
    shippingId: string;
    sucursalId: string | null;
    onSave: () => void;

}

const EditProductsModal = ({
                               visible,
                               onCancel,
                               products,
                               setProducts,
                               allProducts,
                               sellers,
                               isAdmin,
                               shippingId,
                               sucursalId,
                               onSave
                           }: EditProductsModalProps) => {

    const [localProducts, setLocalProducts] = useState<any[]>([]);
    const [searchKey, setSearchKey] = useState<string | null>(null);
    const [tempProductModalVisible, setTempProductModalVisible] = useState(false);

    // Backup al abrir el modal
    useEffect(() => {
        if (visible) {
            setLocalProducts(products.map(p => {
                const productoCompleto = allProducts.find(ap =>
                    ap.nombre_variante === (p.nombre_variante || p.producto)
                );

                const stockActual = productoCompleto?.stockActual ?? 0;
                const cantidadVendida = Number(p.cantidad || 0);
                const cantidadMaximaEditable = stockActual + cantidadVendida;

                return {
                    ...p,
                    cantidadMaximaEditable
                };
            }));
        }
    }, [visible]);
    //console.log("SHIPPING ID:", shippingId, "Sucursal ID:", sucursalId);
    const handleValueChange = (key: string, field: string, value: any) => {
        setLocalProducts((prev: any[]) =>
            prev.map((p) => {
                if (p.key !== key) return p;

                const updated = { ...p, [field]: value };

                if (field === 'cantidad' || field === 'precio_unitario') {
                    const vendedorId = p.id_vendedor || p.vendedor?._id;
                    const vendedor = sellers.find((v: any) => v._id === vendedorId);
                    const comision = Number(vendedor?.comision_porcentual || 0);
                    const cantidad = Number(updated.cantidad || 0);
                    const precio = Number(updated.precio_unitario || 0);
                    const utilidadCalculada = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));
                    updated.utilidad = utilidadCalculada;
                }

                return updated;
            })
        );
    };
    const handleDeleteProduct = (key: string) => {
        setLocalProducts((prev: any[]) => prev.filter((p) => p.key !== key));
    };

    const allSelectedKeys = useMemo(() => {
        return new Set(localProducts.map(p => p.key));
    }, [localProducts]);

    const allSelectedNames = useMemo(() => {
        return new Set(localProducts.map(p => p.nombre_variante || p.producto));
    }, [localProducts]);

    const hoy = new Date().setHours(0, 0, 0, 0);

    const filteredOptions = useMemo(() => {
        const vigentes = allProducts.filter(p => {
            const vendedor = sellers.find(s => s._id === p.id_vendedor);
            if (!vendedor) return false;
            const fecha = vendedor.fecha_vigencia ? new Date(vendedor.fecha_vigencia).getTime() : Infinity;
            return fecha >= hoy;
        });

        return vigentes
            .filter((p) => {
                const nombre = p.nombre_variante || p.producto;
                const stock = Number(p.stockActual ?? 0);
                return !allSelectedNames.has(nombre) && stock > 0;
            })
            .map((p) => ({
                label: p.nombre_variante || p.producto || "Sin nombre",
                value: p.key,
                rawProduct: p
            }));
    }, [allProducts, sellers, allSelectedNames]);

    const handleSelectProduct = (key: string) => {
        const selected = allProducts.find((p) => p.key === key);

        if (selected) {
            const yaExiste = localProducts.some((prod) => prod.key === key);
            if (yaExiste) {
                message.warning("Este producto ya ha sido añadido.");
                return;
            }

            const vendedor = sellers.find((v: any) => v._id === selected.id_vendedor);
            const comision = vendedor?.comision_porcentual || 0; // Si quieres usar la comisión del vendedor
            const utilidadCalculada = parseFloat(((selected.precio * 1 * comision) / 100).toFixed(2));

            setLocalProducts((prev: any[]) => [
                ...prev,
                {
                    ...selected,
                    id_producto: selected._id,
                    cantidad: 1,
                    precio_unitario: selected.precio,
                    utilidad: utilidadCalculada,
                },
            ]);
        } else {
            message.warning("Producto no encontrado.");
        }

        setSearchKey(null);
    };
    // 🔧 RESTAR stock (para nuevos o cuando se aumenta cantidad)
    const restarStock = async (productos: any[]) => {
        if (!sucursalId) return;

        for (const prod of productos) {
            if (!prod.id_producto) continue;

            const productoOriginal = allProducts.find(p =>
                p._id === prod.id_producto || p.id_producto === prod.id_producto
            );
            if (!productoOriginal) continue;

            const sucursalData = productoOriginal.sucursales?.find((s: any) =>
                String(s.id_sucursal) === String(sucursalId)
            );
            if (!sucursalData) continue;

            const variantes = prod.variantes || productoOriginal.variantes;
            const combinacion = sucursalData.combinaciones.find((c: any) =>
                JSON.stringify(c.variantes) === JSON.stringify(variantes)
            );
            if (!combinacion) continue;
            /*console.log("🛠️ Intentando actualizar stock para:", {
                producto: prod.nombre_variante || prod.producto,
                id_producto: prod.id_producto,
                variantes: prod.variantes,
                cantidad: prod.cantidad
            });
            */
            const nuevoStock = (combinacion.stock ?? 0) - Number(prod.cantidad || 0);

            try {
                /*
                console.log("✅ Update stock: ", {
                    productId: prod.id_producto,
                    sucursalId,
                    variantes,
                    nuevoStock
                });
                */

                await updateSubvariantStockAPI({
                    productId: prod.id_producto,
                    sucursalId,
                    variantes,
                    stock: nuevoStock,
                });
            } catch (err) {
                console.error("❌ Error al RESTAR stock:", err);
            }
        }
    };

// 🔧 SUMAR stock (para eliminados o reducción de cantidad)
    const sumarStock = async (productos: any[]) => {
        if (!sucursalId) return;

        for (const prod of productos) {
            if (!prod.id_producto) continue;

            const productoOriginal = allProducts.find(p =>
                p._id === prod.id_producto || p.id_producto === prod.id_producto
            );
            if (!productoOriginal) continue;

            const sucursalData = productoOriginal.sucursales?.find((s: any) =>
                String(s.id_sucursal) === String(sucursalId)
            );
            if (!sucursalData) continue;

            const variantes = prod.variantes || productoOriginal.variantes;
            const combinacion = sucursalData.combinaciones.find((c: any) =>
                JSON.stringify(c.variantes) === JSON.stringify(variantes)
            );
            if (!combinacion) continue;
            /*
            console.log("🛠️ Intentando actualizar stock para:", {
                producto: prod.nombre_variante || prod.producto,
                id_producto: prod.id_producto,
                variantes: prod.variantes,
                cantidad: prod.cantidad
            });

             */

            const nuevoStock = (combinacion.stock ?? 0) + Number(prod.cantidad || 0);

            try {
                /*
                console.log("✅ Update stock: ", {
                    productId: prod.id_producto,
                    sucursalId,
                    variantes,
                    nuevoStock
                });

                 */

                await updateSubvariantStockAPI({
                    productId: prod.id_producto,
                    sucursalId,
                    variantes,
                    stock: nuevoStock,
                });
            } catch (err) {
                console.error("❌ Error al SUMAR stock:", err);
            }
        }
    };

    const handleGuardar = async () => {
        console.log("🧪 handleGuardar EJECUTADO");

        const existentes = localProducts.filter(p => p.id_venta);
        const nuevos = localProducts.filter(p => !('id_venta' in p));
        console.log("🧪 Productos detectados como nuevos:", nuevos);

        const temporales = nuevos.filter(p => p.esTemporal && (!p.id_producto || p.id_producto.length !== 24));

        const temporalesYaRegistrados = nuevos.filter(
            p => p.esTemporal && p.id_producto && p.id_producto.length === 24
        );

        const normales = nuevos.filter(
            p => !p.esTemporal && p.id_producto?.length === 24
        );


        const originalesMap = new Map();

        for (const p of products) {
            if (p.key) originalesMap.set(p.key, p);
            if (p.id_venta) originalesMap.set(p.id_venta, p);
        }

        const eliminadosConData = products.filter(prev =>
            !localProducts.some(p => p.key === prev.key || p.id_venta === prev.id_venta)
        );

        const modificadosConCambioCantidad = existentes.filter(p => {
            const original = originalesMap.get(p.key);

            if (!original) return false;

            return (
                Number(p.cantidad) !== Number(original.cantidad) ||
                Number(p.precio_unitario) !== Number(original.precio_unitario) ||
                Number(p.utilidad) !== Number(original.utilidad)
            );
        });

        const aumentaron = modificadosConCambioCantidad.filter(p => {
            const original = originalesMap.get(p.key);
            return Number(p.cantidad) > Number(original?.cantidad);
        });

        const disminuyeron = modificadosConCambioCantidad.filter(p => {
            const original = originalesMap.get(p.key);
            return Number(p.cantidad) < Number(original?.cantidad);
        });
        //console.log("🆕 Nuevos normales:", normales);
        //console.log("🧾 Temporales:", temporales);
        //console.log("🖊️ Modificados:", modificadosConCambioCantidad);
        //console.log("📉 Aumentaron:", aumentaron);
        //console.log("📈 Disminuyeron:", disminuyeron);
        //console.log("❌ Eliminados:", eliminadosConData);
        try {
            // ⚙️ 1. Registrar productos temporales si no existen y tratarlos como normales
            const temporalesPreparados = [];

            for (const temp of temporales) {
                if (!temp.id_producto || temp.id_producto.length !== 24) {
                    const nuevoProducto = await registerProductAPI({
                        nombre_producto: temp.nombre_variante || temp.producto,
                        id_vendedor: temp.id_vendedor,
                        id_categoria: temp.id_categoria || undefined,
                        esTemporal: true,
                        sucursales: [{
                            id_sucursal: sucursalId,
                            combinaciones: [{
                                variantes: temp.variantes || { Variante: "Temporal" },
                                precio: temp.precio_unitario,
                                stock: temp.cantidad || 1
                            }]
                        }]
                    });

                    if (nuevoProducto?.success) {
                        temp.id_producto = nuevoProducto.newProduct._id;
                    } else {
                        message.error("Error al registrar un producto temporal");
                        continue;
                    }
                }
                //console.log('sucursal', sucursalId, 'shippingId', shippingId, 'temp', temp);

                temporalesPreparados.push({
                    cantidad: temp.cantidad,
                    precio_unitario: temp.precio_unitario,
                    utilidad: temp.utilidad,
                    id_producto: temp.id_producto,
                    id_pedido: shippingId,
                    id_vendedor: temp.id_vendedor,
                    sucursal: sucursalId,
                    deposito_realizado: false,
                    nombre_variante: temp.nombre_variante || temp.producto,
                });
            }

// ⚙️ 2. Registrar los nuevos normales + temporales preparados
            // ⚙️ 2. Registrar los nuevos normales + temporales preparados
            const nuevosTodos = [
                ...normales,
                ...temporalesPreparados,
                ...temporalesYaRegistrados.map(p => ({
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: p.utilidad,
                    id_producto: p.id_producto,
                    id_pedido: shippingId,
                    id_vendedor: p.id_vendedor,
                    sucursal: sucursalId,
                    deposito_realizado: false,
                    nombre_variante: p.nombre_variante || p.producto,
                }))
            ];
            //console.log("📤 Nuevos productos antes de if:", nuevosTodos);

            if (nuevosTodos.length > 0) {

                const payload = {
                    shippingId,
                    sales: nuevosTodos
                };

                try {
                    const response = await registerSalesToShippingAPI(payload);

                    if (!response?.success) {
                        console.error("❌ Falló el registro de ventas. Detalles:", response);
                        message.error("❌ No se pudo registrar las ventas");
                        return;
                    }
                } catch (err) {
                    console.error("💥 Error al ejecutar registerSalesToShippingAPI:", err);
                    message.error("❌ Error crítico al registrar ventas");
                    return;
                }

                await restarStock(nuevosTodos);
            }

            // Actualizar modificados
            if (modificadosConCambioCantidad.length > 0) {
                const cleaned = modificadosConCambioCantidad.map(p => ({
                    id_venta: p.id_venta,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: p.utilidad,
                    id_producto: p.id_producto,
                }));
                await updateProductsByShippingAPI(shippingId, cleaned);
            }

            // Stock por aumentos
            // Stock por aumentos
            if (aumentaron.length > 0) {
                const aRestar = aumentaron.map(p => {
                    const original = originalesMap.get(p.key) || {};
                    const fullProduct = allProducts.find(ap =>
                        ap.nombre_variante === (p.nombre_variante || original.nombre_variante)
                    );

                    return {
                        ...p,
                        cantidad: Number(p.cantidad) - Number(original?.cantidad || 0),
                        id_producto: p.id_producto || original?.id_producto || fullProduct?._id,
                        variantes: p.variantes || original?.variantes || fullProduct?.variantes,
                    };
                });
                //console.log("🔻 A Restar con datos completos:", aRestar);
                await restarStock(aRestar);
            }

// Stock por reducciones
            if (disminuyeron.length > 0) {
                const aSumar = disminuyeron.map(p => {
                    const original = originalesMap.get(p.key) || {};
                    const fullProduct = allProducts.find(ap =>
                        ap.nombre_variante === (p.nombre_variante || original.nombre_variante)
                    );

                    return {
                        ...p,
                        cantidad: Number(original?.cantidad || 0) - Number(p.cantidad),
                        id_producto: p.id_producto || original?.id_producto || fullProduct?._id,
                        variantes: p.variantes || original?.variantes || fullProduct?.variantes,
                    };
                });
                //console.log("🔺 A Sumar con datos completos:", aSumar);
                await sumarStock(aSumar);
            }
            // Eliminados
            if (eliminadosConData.length > 0) {
                const eliminadosIds = eliminadosConData.map(p => p.id_venta);
                await deleteProductsByShippingAPI(shippingId, eliminadosIds);
                const eliminadosParaStock = eliminadosConData.map(p => {
                    const original = products.find(pr => pr.key === p.key || pr.id_venta === p.id_venta) || {};

                    // Intenta buscar el producto completo en allProducts
                    const fullProduct = allProducts.find(ap =>
                        ap.nombre_variante === (p.nombre_variante || original.nombre_variante)
                    );

                    const variantes = p.variantes || original.variantes || fullProduct?.variantes;
                    const id_producto = p.id_producto || original.id_producto || fullProduct?._id;

                    return {
                        ...p,
                        variantes,
                        id_producto
                    };
                });
                //console.log("🧪 Eliminados para stock (final):", eliminadosParaStock);
                await sumarStock(eliminadosParaStock);
            }

            message.success("Productos actualizados con éxito");
            setProducts(localProducts);
            onCancel();

        } catch (error) {
            console.error("❌ Error actualizando productos:", error);
            message.error("Error al guardar productos");
        }
    };


    const handleCancelar = () => {
        setLocalProducts([]); // limpio backup
        onCancel();
    };


    return (
        <Modal
            title="Editar Productos del Pedido"
            open={visible}
            onCancel={handleCancelar}
            width={900}
            footer={[
                <Button key="cancel" onClick={handleCancelar}>
                    Cancelar
                </Button>,
                <Button key="save" type="primary" onClick={handleGuardar}>
                    Guardar
                </Button>
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Button
                    style={{ marginBottom: 12 }}
                    type="dashed"
                    onClick={() => setTempProductModalVisible(true)}
                >
                    Agregar Producto Temporal
                </Button>

                <Select
                    showSearch
                    value={searchKey}
                    placeholder="Buscar y añadir producto"
                    onChange={handleSelectProduct}
                    options={filteredOptions}
                    style={{ width: '100%' }}
                    allowClear
                    filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                />
            </div>

            <EmptySalesTable
                products={localProducts}
                onDeleteProduct={handleDeleteProduct}
                handleValueChange={handleValueChange}
                onUpdateTotalAmount={() => {}} // opcional
                sellers={sellers}
                isAdmin={isAdmin}
            />
            <ProductSellerViewModal
                visible={tempProductModalVisible}
                onCancel={() => setTempProductModalVisible(false)}
                onSuccess={() => setTempProductModalVisible(false)}
                onAddProduct={(tempProduct: any) => {
                    const vendedor = sellers.find((v: any) => v._id === tempProduct.id_vendedor);
                    const comision = vendedor?.comision_porcentual || 0;
                    const precio = tempProduct.precio_unitario || tempProduct.precio || 0;
                    const cantidad = tempProduct.cantidad || 1;

                    const utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));

                    setLocalProducts(prev => [
                        ...prev,
                        {
                            ...tempProduct,
                            id_producto: tempProduct._id,
                            cantidad,
                            precio_unitario: precio,
                            utilidad,
                            esTemporal: true
                        }
                    ]);
                }}

                selectedSeller={null} // Esto indica que fue abierto desde edición
                openFromEditProductsModal={true} // 💡 importante para el siguiente punto
                sellers={sellers}
            />

        </Modal>
    );
};

export default EditProductsModal;