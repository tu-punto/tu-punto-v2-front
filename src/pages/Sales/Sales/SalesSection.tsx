import { useEffect, useState } from "react";
import { Button, message, Spin } from "antd";
import EmptySalesTable from "../EmptySalesTable";
import SalesFormModal from "../SalesFormmodal";
import ShippingFormModal from "../ShippingFormmodal";
import { registerSalesToShippingAPI } from "../../../api/shipping";
import CardSection from "../../../components/CardSection";
import { useUserRole } from "../../../hooks/useUserRole";

interface SalesSectionProps {
    branchID: string | null;
    selectedProducts: any[];
    setSelectedProducts: (products: any[] | ((prev: any[]) => any[])) => void;
    sellers: any[];
}

function SalesSection({ branchID, selectedProducts, setSelectedProducts, sellers }: SalesSectionProps) {
    const { isAdmin, isOperator } = useUserRole();
    const [loading, setLoading] = useState(false);
    const [modalType, setModalType] = useState<'sales' | 'shipping' | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setLoading(false)
        setSelectedProducts([])
        setTotalAmount(0)
    }, [branchID])

    const handleDeleteProduct = (key: any) => {
        setSelectedProducts((prevProducts: any) => {
            const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
            return updatedProducts;
        });
    };

    const handleEnhancedValueChange = (key: string, field: string, value: any) => {
        setSelectedProducts((prev: any[]) => {
            return prev.map((p) => {
                if (p.key !== key) return p;
                const updated = { ...p, [field]: value };

                if (field === 'cantidad' || field === 'precio_unitario') {
                    const vendedor = sellers.find((v: any) => v._id === p.id_vendedor);
                    const comision = Number(vendedor?.comision_porcentual || 0);
                    const cantidad = Number(updated.cantidad || 0);
                    const precio = Number(updated.precio_unitario || 0);
                    updated.utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));
                }

                return updated;
            });
        });
    };

    const updateTotalAmount = (amount: number) => {
        setTotalAmount(amount);
    };

    const createSales = async (shipping: any, productsToAdd: any) => {
        productsToAdd.map((item: any) => {
            item.productos = item.key
            item.vendedor = item.id_vendedor
        })
        try {
            await registerSalesToShippingAPI({
                shippingId: shipping._id,
                sales: productsToAdd
            });
        } catch (error) {
            message.error('Error registrando ventas del pedido')
        }
    }

    const handleSuccess = () => {
        setModalType(null);
        setSelectedProducts([]);
        setTotalAmount(0);
        setRefreshKey(prevKey => prevKey + 1);
    };

    const showSalesModal = () => {
        if (selectedProducts.length === 0) {
            message.warning("Debes seleccionar al menos un producto para realizar una venta.")
            return
        }
        setModalType('sales')
    }

    const showShippingModal = () => {
        if (selectedProducts.length === 0) {
            message.warning("Debes seleccionar al menos un producton para realizar una entrega.")
            return
        }
        setModalType('shipping')
    }

    const handleCancel = () => {
        setModalType(null)
    }

    const actions = (
        <>
            {(isAdmin || isOperator) && (
                <Button
                    onClick={showSalesModal}
                    type="primary"
                    className="text-mobile-base xl:text-desktop-sm "
                >
                    Realizar Venta
                </Button>
            )}
            <Button
                onClick={showShippingModal}
                type="primary"
            >
                Realizar Entrega
            </Button>
        </>
    )

    return (
        <CardSection
            title="Ventas"
            actions={actions}
        >
            <>
                <Spin spinning={loading} tip="Cargando carrito">
                    <EmptySalesTable
                        products={selectedProducts}
                        onDeleteProduct={handleDeleteProduct}
                        handleValueChange={handleEnhancedValueChange}
                        onUpdateTotalAmount={updateTotalAmount}
                        key={refreshKey}
                        sellers={sellers}
                        isAdmin={isAdmin || isOperator}
                    />
                </Spin>
                <SalesFormModal
                    visible={modalType === "sales"}
                    onCancel={handleCancel}
                    onFinish={() => {}}
                    onSuccess={handleSuccess}
                    selectedProducts={selectedProducts}
                    handleSales={createSales}
                    totalAmount={totalAmount}
                    sucursals={[]}
                    clearSelectedProducts={() => setSelectedProducts([])}
                    sellers={sellers}
                    suc={branchID}
                />
                <ShippingFormModal
                    visible={modalType === "shipping"}
                    onCancel={handleCancel}
                    onFinish={() => {}}
                    onSuccess={handleSuccess}
                    selectedProducts={selectedProducts}
                    handleSales={createSales}
                    totalAmount={totalAmount}
                    sucursals={[]}
                    clearSelectedProducts={() => setSelectedProducts([])}
                    isAdmin={isAdmin || isOperator}
                    sellers={sellers}
                    suc={branchID}
                />
            </>
        </CardSection>
    );
}

export default SalesSection;