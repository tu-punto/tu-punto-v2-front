import { Button, Card, Col, Input, message, Row, Select, Space, Typography } from "antd";
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
    //console.log ("🚀 user en Sales:", user);

    const [modalType, setModalType] = useState<'sales' | 'shipping' | null>(null);
    const [productAddModal, setProductAddModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0)
    const [sellers, setSellers] = useState([])
    const [selectedSellerId, setSelectedSellerId] = useState<number | undefined>(undefined);
    //const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [selectedProducts, setSelectedProducts, handleValueChange] = useEditableTable([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const { data, fetchProducts } = useProducts(!isAdmin ? selectedBranchId || undefined : undefined);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [branches, setBranches] = useState([] as any[]);
    const [searchText, setSearchText] = useState("");

    const sucursalId = localStorage.getItem('sucursalId');

    const updateTotalAmount = (amount: number) => {
        setTotalAmount(amount);
    };
    const showSalesModal = () => {
        if (selectedProducts.length === 0) {
            message.warning("Debes seleccionar al menos un producto para realizar una venta.");
            return;
        }
        setModalType('sales');
    };

    const showShippingModal = () => {
        if (selectedProducts.length === 0) {
            message.warning("Debes seleccionar al menos un producto para realizar una entrega.");
            return;
        }
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

    const handleSuccess = async () => {
        setModalType(null);
        await fetchProducts(); // <- fuerza recarga del inventario con stock actualizado
        setRefreshKey(prevKey => prevKey + 1); // para que también se actualicen las tablas dependientes
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
    useEffect(() => {
        if (!isAdmin && branches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(branches[0]._id);
        }
    }, [branches, isAdmin]);

    useEffect(() => {
        if (!isAdmin && selectedBranchId) {
            fetchProducts();
        }
        if (isAdmin) {
            fetchProducts();
        }
    }, [selectedBranchId, isAdmin]);
    const filteredProducts = () => {
        let filteredData = data;

        if (!isAdmin) {
            filteredData = filteredData.filter(p => p.id_vendedor === user.id_vendedor);
            if (selectedBranchId) {
                filteredData = filteredData.filter(p => p.sucursalId === selectedBranchId);
            }
        } else {
            if (selectedSellerId) {
                filteredData = filteredData.filter(p => p.id_vendedor === selectedSellerId);
            }
        }

        if (searchText.trim()) {
            const lowerSearch = searchText.toLowerCase();
            filteredData = filteredData.filter(product =>
                product.producto.toLowerCase().includes(lowerSearch)
            );
        }

        filteredData = filteredData.filter(product => product.stockActual > 0);

        return filteredData;
    };

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
            //console.log("📤 Enviando ventas:", productsToAdd);
            await registerSalesToShippingAPI({
                shippingId: shipping._id,
                sales: productsToAdd
            });
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
                        vendedor: sellers.find((seller: any) => seller._id === id_vendedor) || id_vendedor,
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
                const id_vendedor = product_seller.vendedor._id || product_seller.vendedor;
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
        const vendedor = sellers.find((v: any) => v._id === newProduct.id_vendedor);
        const comision = Number(vendedor?.comision_porcentual || 0);
        const precio = newProduct.precio_unitario || newProduct.precio || 0;
        const cantidad = newProduct.cantidad || 1;

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
    //console.log("🚀 Productos pasados a ProductTable", handleProductSelect);

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src="/shopping-cart-icon.png" alt="Carrito" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Carrito
                    </h1>
                </div>
            </div>

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
                                        <Input.Search
                                            placeholder="Buscar producto..."
                                            onChange={(e) => setSearchText(e.target.value)}
                                            style={{ width: 200 }}
                                            allowClear
                                        />
                                        {!isAdmin && (
                                            <Select
                                                placeholder="Sucursal"
                                                value={selectedBranchId}
                                                onChange={(value) => setSelectedBranchId(value)}
                                                options={branches.map((sucursal: any) => ({
                                                    value: sucursal._id,
                                                    label: sucursal.nombre,
                                                }))}
                                                style={{ minWidth: 180 }}
                                                allowClear
                                            />
                                        )}
                                        <Button
                                            type="primary"
                                            onClick={() => setProductAddModal(true)}
                                            className="text-mobile-base xl:text-desktop-sm "
                                        >
                                            Añadir nuevo producto
                                        </Button>
                                        {isAdmin && (
                                            <Select
                                                placeholder="Selecciona un vendedor"
                                                options={sellers.map((vendedor: any) => ({
                                                    value: vendedor._id,
                                                    label: vendedor.nombre + " " + vendedor.apellido,
                                                }))}
                                                filterOption={(input, option: any) =>
                                                    option.label.toLowerCase().includes(input.toLowerCase())
                                                }
                                                style={{ minWidth: 200 }}
                                                onChange={(value) => setSelectedSellerId(value)}
                                                showSearch
                                                allowClear
                                            />
                                        )}
                                    </Space>
                                </Col>
                            </Row>

                        }
                        bordered={false}
                    >
                        <ProductTable
                            onSelectProduct={handleProductSelect}
                            refreshKey={refreshKey}
                            data={filteredProducts()}
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
                            sellers={sellers}
                            isAdmin={isAdmin}
                        />
                    </Card>
                </Col>
            </Row>
            <ProductSellerViewModal
                visible={productAddModal}
                onCancel={handleProductModalCancel}
                onSuccess={handleSuccessProductModal}
                onAddProduct={handleAddProduct}
                selectedSeller={
                    isAdmin
                        ? sellers.find((s: any) => s._id === selectedSellerId) || null
                        : { _id: user?.id_vendedor, nombre: user?.nombre_vendedor?.split(" ")[0] || "", apellido: user?.nombre_vendedor?.split(" ")[1] || "" }
                }            />
            <SalesFormModal
                visible={modalType === "sales"}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
                selectedProducts={selectedProducts}
                handleSales={createSales}
                totalAmount={totalAmount}
                sucursals={branches}
                //handleDebt={updateSellerDebt}
                clearSelectedProducts={() => setSelectedProducts([])}
                sellers={sellers}
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
                //handleDebt={updateSellerDebt}
                clearSelectedProducts={() => setSelectedProducts([])}
                isAdmin={isAdmin}
                sellers={sellers}
            />
        </>
    );
};

export default Sales;
