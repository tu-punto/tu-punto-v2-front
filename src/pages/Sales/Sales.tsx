import { Button, Card, Col, message, Row, Select, Space, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
import SalesFormModal from "./SalesFormmodal";
import ProductTable from "../Product/ProductTable";
import { getSellerAPI, getSellersAPI, updateSellerAPI } from "../../api/seller";
import useProducts from "../../hooks/useProducts";
import EmptySalesTable from "./EmptySalesTable";
import useEditableTable from "../../hooks/useEditableTable";
import { registerSalesToShippingAPI } from "../../api/shipping";
import ShippingFormModal from "./ShippingFormmodal";
import { getSucursalsAPI } from "../../api/sucursal";
import { getSellerInfoAPI } from "../../api/financeFlux";
import { getSellerProductsById } from "../../helpers/salesHelpers";
import { UserContext } from "../../context/userContext";
import ProductSellerViewModal from "../Seller/ProductSellerViewModal";
import { IBranch } from "../../models/branchModel";


export const Sales = () => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';

    const [modalType, setModalType] = useState<'sales' | 'shipping' | null>(null);
    const [productAddModal, setProductAddModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0)
    const [sellers, setSellers] = useState([])
    const [selectedSellerId, setSelectedSellerId] = useState<number | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [selectedProducts, setSelectedProducts, handleValueChange] = useEditableTable([])
    const { data, fetchProducts } = useProducts();
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [branches, setBranches] = useState([] as any[]);

    const updateTotalAmount = (amount: number) => {
        setTotalAmount(amount);
    };
    const showSalesModal = () => {
        setModalType('sales');
    };

    const showShippingModal = () => {
        setModalType('shipping');
    };

    const handleCancel = () => {
        setModalType(null);
    };

    const handleProductModalCancel = () => {
        setProductAddModal(false);
    };

    const handleSuccessProductModal = async () => {
        setProductAddModal(false);
        await fetchProducts();
    };

    const onFinish = (values: any) => {
        // Aquí se pueden procesar los datos, como enviarlos al backend
        setModalType(null);
        setSelectedProducts([]);
        setTotalAmount(0);
    };

    const handleSuccess = () => {
        setModalType(null);
        setRefreshKey(prevKey => prevKey + 1);
    };

    const fetchSellers = async () => {
        try {
            const response = await getSellersAPI();
            setSellers(response);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }

    };

    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsAPI()
            setBranches(response)
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    }

    const fetchFinanceSellerInfo = async (sellerId: number) => {
        try {
            const response = await getSellerInfoAPI(sellerId)
            // setSucursal(response)
            return response
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    }

    useEffect(() => {
        fetchSellers();
        fetchSucursal();
    }, []);

    const filteredProducts = () => {
        let filteredData = data.filter((product: any) => product.groupId !== 1)
        if (!isAdmin) {
            return filteredData
        }
        if (selectedSellerId) {
            filteredData = filteredData.filter(product => product.id_vendedor === selectedSellerId)
        }

        if (selectedBranchId) {
            filteredData = filteredData.filter(product => {
                for (const prodBranch of product.producto_sucursal) {
                    if (prodBranch.id_sucursal === selectedBranchId) {
                        return product
                    }
                }
            })
        }
        return filteredData
    }

    const handleProductSelect = (product: any) => {
        // setEditableProducts((prevProducts: any) => {
        setSelectedProducts((prevProducts: any) => {
            const exists = prevProducts.find((p: any) => p.key === product.key);
            if (!exists) {
                return [...prevProducts, { ...product, cantidad: 1, precio_unitario: product.precio, utilidad: 1 }];
            }
            return prevProducts;
        });
    };
    const handleDeleteProduct = (key: any) => {
        setSelectedProducts((prevProducts: any) => {
            const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
            return updatedProducts;
        });
    };

    const createSales = async (shipping: any, productsToAdd: any) => {
        productsToAdd.map((item: any) => {
            item.productos = item.key
            item.vendedor = item.id_vendedor
        })
        try {
            await registerSalesToShippingAPI({
                shippingId: shipping.id_pedido,
                sales: productsToAdd
            })
        } catch (error) {
            message.error('Error registrando ventas del pedido')
        }
    }
    const calculateSellerDebt = async (id_vendedor: number): Promise<number> => {
        try {
            const sellerDebtInfo: any = await fetchFinanceSellerInfo(id_vendedor);
            const deudaTotalFinance = sellerDebtInfo?.filter((deuda: any) => deuda.esDeuda)
                .reduce((acc: number, deuda: any) => acc + parseFloat(deuda.monto), 0) || 0;
            return deudaTotalFinance;
        } catch (error) {
            console.error('Error al calcular la deuda del vendedor:', error);
            return 0;
        }
    };

    const previousProductsDebt = async (sellerId: number) => {
        //TODO:Delete if it is not useful anymore
        const sellerProducts = await getSellerProductsById(sellerId);
        const ventasNoPagadasProductos = sellerProducts.filter((product: any) => product.deposito_realizado === false);
        const totalDeudaProductos = ventasNoPagadasProductos.reduce((acc: number, producto: any) => {
            return acc + (producto.cantidad * producto.precio_unitario);
        }, 0);

        return totalDeudaProductos;
    }

    const updateSellerDebt = async (selectedProducts: any, prepayment: number) => {
        try {
            const productsBySeller = selectedProducts.reduce((acc: any, producto: any) => {
                const { id_vendedor } = producto;
                if (!acc[id_vendedor]) {
                    acc[id_vendedor] = {
                        vendedor: sellers.find((seller: any) => seller.id_vendedor === id_vendedor) || id_vendedor,
                        productos: []
                    };
                }
                acc[id_vendedor].productos.push({
                    id_producto: producto.key, cantidad: producto.cantidad, precio_unitario: producto.precio_unitario
                });
                return acc;
            }, {});

            // const debtBySeller = Object.values(productsBySeller).map((product_seller: any) => ({
            //     id_vendedor: product_seller.vendedor.id_vendedor || product_seller.vendedor,
            //     deuda: product_seller.productos.reduce((acc: number, producto: any) =>
            //         acc + (producto.cantidad * producto.precio_unitario), product_seller.vendedor.deuda)
            // }))
            const debtBySeller = await Promise.all(Object.values(productsBySeller).map(async (product_seller: any) => {
                const id_vendedor = product_seller.vendedor.id_vendedor || product_seller.vendedor;
                // const sellerDebtFinanceFlux = await calculateSellerDebt(id_vendedor);
                // const sellerProductsDebt = await previousProductsDebt(id_vendedor);
                const sellerInfo = await getSellerAPI(id_vendedor);
                const sellerCurrentDoubt = sellerInfo.deuda;
                const deudaTotalProducts = product_seller.productos.reduce((acc: number, producto: any) =>
                    acc + (producto.cantidad * producto.precio_unitario), 0);
                const deudaTotal = sellerCurrentDoubt + deudaTotalProducts - prepayment;
                return {
                    id_vendedor,
                    deuda: deudaTotal
                };
            }));
            const debtsRes = await Promise.all(debtBySeller.map(async (vendedor: any) =>
                updateSellerAPI(vendedor.id_vendedor, { deuda: vendedor.deuda })
            ))
            debtsRes.map((debtRes: any,) => {
                if (!debtRes.success) message.error('Error al registrar una deuda')
            })
            message.success('Deudas registradas con éxito')
        } catch (error) {
            console.error("Error actualizando la deuda del vendedor:", error);
            message.error('Error al actualizar las deudas');
        }
    }
    const handleAddProduct = (newProduct: any) => {
        setSelectedProducts((prevProducts: any) => [...prevProducts, newProduct]);
    };

    return (
        <>
            <h1 className="text-mobile-2xl xl:text-desktop-2xl font-bold mb-4">
                Carrito
            </h1>
            <Row gutter={[16, 16]}>
                {/* Columna de Inventario */}
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Row justify="space-between" align="middle" gutter={[8, 8]}>
                                <Col>
                                    <Typography.Text className="text-mobile-base xl:text-desktop-sm ">
                                        Inventario
                                    </Typography.Text>
                                </Col>
                                <Col>
                                    <Space wrap>
                                        <Button
                                            type="primary"
                                            onClick={() => setProductAddModal(true)}
                                            className="text-mobile-base xl:text-desktop-sm "
                                        >
                                            Añadir nuevo producto
                                        </Button>
                                        {isAdmin && (
                                            <Space wrap>
                                                <Select
                                                    placeholder="Selecciona un vendedor"
                                                    options={sellers.map((vendedor: any) => ({
                                                        value: vendedor.id_vendedor,
                                                        label: vendedor.nombre,
                                                    }))}
                                                    filterOption={(input, option: any) =>
                                                        option.label
                                                            .toLowerCase()
                                                            .includes(input.toLowerCase())
                                                    }
                                                    style={{ minWidth: 200 }}
                                                    onChange={(value) => setSelectedSellerId(value)}
                                                    showSearch
                                                    allowClear
                                                />
                                                <Select
                                                    placeholder="Selecciona una sucursal"
                                                    options={branches.map((branch: IBranch) => ({
                                                        value: branch.id_sucursal,
                                                        label: branch.nombre,
                                                    }))}
                                                    filterOption={(input, option: any) =>
                                                        option.label
                                                            .toLowerCase()
                                                            .includes(input.toLowerCase())
                                                    }
                                                    style={{ minWidth: 200 }}
                                                    onChange={(value) => setSelectedBranchId(value)}
                                                    showSearch
                                                    allowClear
                                                />
                                            </Space>
                                        )}
                                    </Space>
                                </Col>
                            </Row>
                        }
                        bordered={false}
                    >
                        <ProductTable
                            data={filteredProducts()}
                            onSelectProduct={handleProductSelect}
                            key={refreshKey}
                        />
                    </Card>
                </Col>

                {/* Columna de Ventas */}
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <Row justify="space-between" align="middle" gutter={[8, 8]}>
                                <Col>
                                    <Typography.Text className="text-mobile-base xl:text-desktop-sm ">
                                        Ventas
                                    </Typography.Text>
                                </Col>

                                <Col>
                                    <Space wrap>
                                        {isAdmin && (
                                            <Button
                                                onClick={showSalesModal}
                                                type="primary"
                                                className="text-mobile-base xl:text-desktop-sm "
                                            >
                                                Realizar Venta
                                            </Button>
                                        )}
                                        <Button onClick={showShippingModal} type="primary">
                                            Realizar Entrega
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>
                        }
                        bordered={false}
                    >
                        <EmptySalesTable
                            products={selectedProducts}
                            onDeleteProduct={handleDeleteProduct}
                            handleValueChange={handleValueChange}
                            onUpdateTotalAmount={updateTotalAmount}
                            key={refreshKey}
                        />
                    </Card>
                </Col>
            </Row>

            <ProductSellerViewModal
                visible={productAddModal}
                onCancel={handleProductModalCancel}
                onSuccess={handleSuccessProductModal}
                onAddProduct={handleAddProduct}
            />
            <SalesFormModal
                visible={modalType === "sales"}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
                selectedProducts={selectedProducts}
                handleSales={createSales}
                totalAmount={totalAmount}
                sucursals={branches}
                handleDebt={updateSellerDebt}
                clearSelectedProducts={() => setSelectedProducts([])}
            />
            <ShippingFormModal
                visible={modalType === "shipping"}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
                selectedProducts={selectedProducts}
                handleSales={createSales}
                totalAmount={totalAmount}
                sucursals={branches}
                handleDebt={updateSellerDebt}
                clearSelectedProducts={() => setSelectedProducts([])}
                isAdmin={isAdmin}
            />
        </>
    );
};

export default Sales;
