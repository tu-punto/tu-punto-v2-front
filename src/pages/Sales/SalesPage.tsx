import { useEffect, useState } from "react";
import { Col, message, Row } from "antd";
import InventorySection from "./Inventory/InventorySection";
import SalesSection from "./Sales/SalesSection";
import { getSellerAPI } from "../../api/seller";
import PageTemplate from "../../components/PageTemplate";
import { useUserRole } from "../../hooks/useUserRole";

function SalesPage() {
    const {isAdmin, isOperator, isSeller, user} = useUserRole();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [paidBranchList, setPaidBranchList] = useState<any[]>([]);
    

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
                        onProductSelect={(product: any) => {
                            // Este callback será usado para comunicar al componente de ventas
                            console.log("Producto seleccionado:", product);
                        }}
                    />
                </Col>

                {/* Columna Ventas*/}
                <Col xs={24} md={12}>
                    <SalesSection
                        branchID={selectedBranchId}
                    />
                </Col>
            </Row>
        </PageTemplate>
    );
}

export default SalesPage;