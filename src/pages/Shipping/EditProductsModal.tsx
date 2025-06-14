import { Modal, Button, Select, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import EmptySalesTable from '../Sales/EmptySalesTable';
import ProductSellerViewModal from "../Seller/ProductSellerViewModal.tsx";
import {
    deleteProductsByShippingAPI,
    registerSalesAPI,
    updateProductsByShippingAPI
} from '../../api/sales';
import {
    addTemporaryProductsToShippingAPI, updateShippingAPI, deleteShippingAPI
} from '../../api/shipping';
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
            setLocalProducts(JSON.parse(JSON.stringify(products))); // Deep clone
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

    const filteredOptions = useMemo(() => {
        return allProducts
            .filter((p) => {
                const nombre = p.nombre_variante || p.producto;
                return !allSelectedNames.has(nombre);
            })
            .map((p) => ({
                label: p.nombre_variante || p.producto || "Sin nombre",
                value: p.key,
                rawProduct: p
            }));
    }, [allProducts, allSelectedNames]);
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

    const handleGuardar = async () => {
        console.log("📦 localProducts:", localProducts);
        console.log("📦 props.products:", products);
        const nuevos = localProducts.filter(p => !p.id_venta);
        const existentes = localProducts.filter(p => p.id_venta);
        const temporales = nuevos.filter(p => p.esTemporal);
        const normales = nuevos.filter(p => !p.esTemporal && p.id_producto?.length === 24);

        const eliminados = products
            .filter(prev => !localProducts.some(p => p.key === prev.key || p.id_venta === prev.id_venta))
            .filter(p => p.id_venta)
            .map(p => p.id_venta);


        try {
            if (normales.length > 0) {
                await registerSalesAPI(normales.map(p => ({
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: p.utilidad,
                    id_producto: p.id_producto,
                    id_pedido: shippingId,
                    id_vendedor: p.id_vendedor,
                    sucursal: sucursalId,
                    deposito_realizado: false,
                    nombre_variante: p.nombre_variante || p.producto,
                })));
            }
            console.log("🆕 Nuevos normales:", normales);
            console.log("🧾 Temporales:", temporales);
            console.log("✏️ Existentes modificados:", existentes);
            console.log("🗑️ Eliminados:", eliminados);

            if (temporales.length > 0) {
                await addTemporaryProductsToShippingAPI(shippingId, temporales);
            }

            if (existentes.length > 0) {
                const cleaned = existentes.map(p => ({
                    id_venta: p.id_venta,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: p.utilidad,
                    ...(p.id_producto && { id_producto: p.id_producto }),
                }));
                const response = await updateProductsByShippingAPI(shippingId, cleaned);
                console.log("🔄 Update response:", response);
            }
            if (eliminados.length > 0) {
                await deleteProductsByShippingAPI(shippingId, eliminados);
            }

            message.success("Productos actualizados con éxito");
            setProducts(localProducts); // Actualiza estado en ShippingInfoModal
            onCancel(); // Cierra el modal

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