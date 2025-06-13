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
            prev.map((p) =>
                p.key === key ? { ...p, [field]: value } : p
            )
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
        const nuevos = localProducts.filter(p => !p.id_venta);
        const existentes = localProducts.filter(p => p.id_venta);
        const temporales = nuevos.filter(p => p.esTemporal);
        const normales = nuevos.filter(p => !p.esTemporal && p.id_producto?.length === 24);

        const eliminados = products
            .filter((prevProd: any) => !localProducts.some((p: any) => p.key === prevProd.key))
            .filter((p: any) => p.id_venta)
            .map((p: any) => p.id_venta);

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

            if (temporales.length > 0) {
                await addTemporaryProductsToShippingAPI(shippingId, temporales);
            }

            if (existentes.length > 0) {
                await updateProductsByShippingAPI(shippingId, existentes);
            }

            if (eliminados.length > 0) {
                await deleteProductsByShippingAPI(shippingId, eliminados);
            }

            message.success("Productos actualizados con éxito");
            setProducts(localProducts); // actualiza lista en ShippingInfoModal
            onSave(); // para recargar si hace falta
            onCancel(); // cierra el modal
        } catch (error) {
            console.error("❌ Error guardando productos:", error);
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
            />
            <ProductSellerViewModal
                visible={tempProductModalVisible}
                onCancel={() => setTempProductModalVisible(false)}
                onSuccess={() => setTempProductModalVisible(false)}
                onAddProduct={(tempProduct: any) => {
                    setLocalProducts(prev => [...prev, tempProduct]);
                }}
                selectedSeller={null} // Esto indica que fue abierto desde edición
                openFromEditProductsModal={true} // 💡 importante para el siguiente punto
                sellers={sellers}
            />

        </Modal>
    );
};

export default EditProductsModal;