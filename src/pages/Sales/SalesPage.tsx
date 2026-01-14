import { useEffect, useState } from "react";
import { Col, message, Row } from "antd";
import InventorySection from "./Inventory/InventorySection";
import SalesSection from "./Sales/SalesSection";
import { getSellerAPI } from "../../api/seller";
import PageTemplate from "../../components/PageTemplate";
import { useUserRole } from "../../hooks/useUserRole";

function SalesPage() {
    const {isSeller, user} = useUserRole();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [paidBranchList, setPaidBranchList] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    useEffect(( ) => {
        const fetchSellerAndBranchs = async () => {
            if (!isSeller || !user.id_vendedor) return;

            try {
                const seller = await getSellerAPI(user.id_vendedor)

                if (seller.pago_sucursales.length > 0) {
                    const sucursales = seller.pago_sucursales.map((s: any) => ({
                        value: s.id_sucursal?.$oid || s.id_sucursal,
                        label: s.sucursalName,
                    }));
                    setPaidBranchList(sucursales)

                    if (!selectedBranchId) {
                        setSelectedBranchId(sucursales[0].value)
                    }
                }
            } catch (error) {
                message.error("Ocurrio un problema al cargar las sucursales. Intente de nuevo más tarde.")
            }
        }

        fetchSellerAndBranchs()
    }, [isSeller, user])

    const handleProductSelect = (product: any) => {
        setSelectedProducts((prevProducts: any) => {
            const exists = prevProducts.find((p: any) => p.key === product.key);
            if (exists) return prevProducts

            const cantidad = 1;
            const precio = product.precio;
            const vendedor = sellers.find((v: any) => v._id === product.id_vendedor);
            const comision = Number(vendedor?.comision_porcentual || 0);
            const utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));
            return [
                ...prevProducts,
                {
                    ...product,
                    cantidad,
                    precio_unitario: precio,
                    utilidad,
                }
            ];
        });
    };

    const handleAddProduct = (newProduct: any) => {
        const vendedor = sellers.find((v: any) => v._id === newProduct.id_vendedor);
        const comision = Number(vendedor?.comision_porcentual || 0);
        const precio = newProduct.precio_unitario || newProduct.precio || 0;
        const cantidad = newProduct.cantidad || 1

        const utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));

        setSelectedProducts((prevProducts: any) => [
            ...prevProducts,
            {
                ...newProduct,
                cantidad,
                precio_unitario: precio,
                utilidad,
                stockActual: cantidad,
                esTemporal: true,
            }
        ]);
    };

    return (
        <PageTemplate
            title="Carrito"
            iconSrc="/shopping-cart-icon.png"
        >
            <Row gutter={[16, 16]}>
                {/* Columna Inventario */}
                <Col xs={24} md={12}>
                    <InventorySection
                        branchID={selectedBranchId}
                        selectBranch={setSelectedBranchId}
                        activeBranchs={paidBranchList}
                        sellers={sellers}
                        onSellersChange={setSellers}
                        onProductSelect={(product: any) => {
                            handleProductSelect(product);
                        }}
                        onAddProduct={handleAddProduct}
                    />
                </Col>

                {/* Columna Ventas*/}
                <Col xs={24} md={12}>
                    <SalesSection
                        branchID={selectedBranchId}
                        selectedProducts={selectedProducts}
                        setSelectedProducts={setSelectedProducts}
                        sellers={sellers}
                    />
                </Col>
            </Row>
        </PageTemplate>
    );
}

export default SalesPage;