import { Modal, Button, Select, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import EmptySalesTable from '../Sales/EmptySalesTable';

interface EditProductsModalProps {
    visible: boolean;
    onCancel: () => void;
    products: any[];
    setProducts: (updater: any) => void;
    allProducts: any[];
    sellers: any[];
}

const EditProductsModal = ({
                               visible,
                               onCancel,
                               products,
                               setProducts,
                               allProducts,
                               sellers
                           }: EditProductsModalProps) => {
    const [localProducts, setLocalProducts] = useState<any[]>([]);
    const [searchKey, setSearchKey] = useState<string | null>(null);

    // Backup al abrir el modal
    useEffect(() => {
        if (visible) {
            setLocalProducts(JSON.parse(JSON.stringify(products))); // Deep clone
        }
    }, [visible]);

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

    const filteredOptions = useMemo(() => {
        return allProducts
            .filter((p) => !localProducts.some((prod) => prod.key === p.key))
            .map((p) => ({
                label: `${p.producto}`,
                value: p.key,
            }));
    }, [allProducts, localProducts]);

    const handleSelectProduct = (key: string) => {
        const found = allProducts.find((p) => p.key === key);
        if (found) {
            const yaExiste = localProducts.some((prod) => prod.key === key);
            if (yaExiste) {
                message.warning("Este producto ya ha sido añadido.");
                return;
            }

            const vendedor = sellers.find((v: any) => v._id === found.id_vendedor);
            const comision = Number(vendedor?.comision_porcentual || 0);
            const utilidadCalculada = parseFloat(((found.precio * 1 * comision) / 100).toFixed(2));

            setLocalProducts((prev: any[]) => [
                ...prev,
                {
                    ...found,
                    cantidad: 1,
                    precio_unitario: found.precio,
                    utilidad: utilidadCalculada,
                },
            ]);
        } else {
            message.warning("Producto no encontrado.");
        }
        setSearchKey(null);
    };

    const handleGuardar = () => {
        setProducts(localProducts);
        onCancel();
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
        </Modal>
    );
};

export default EditProductsModal;
