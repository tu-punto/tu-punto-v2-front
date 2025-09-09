import { Button, Card, Col, Input, message, Row, Select, Space, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
import SalesFormModal from "./SalesFormmodal";
import ProductTable from "../Product/ProductTable";
import { getSellerAPI, getSellersAPI } from "../../api/seller";
import EmptySalesTable from "./EmptySalesTable";
import useEditableTable from "../../hooks/useEditableTable";
import { registerSalesToShippingAPI } from "../../api/shipping";
import ShippingFormModal from "./ShippingFormmodal";
import { getSucursalsAPI } from "../../api/sucursal";
import { UserContext } from "../../context/userContext";
import ProductSellerViewModal from "../Seller/ProductSellerViewModal";
import useProductsFlat from "../../hooks/useProductsFlat.tsx";


export const Sales = () => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';
    const isOperator = user?.role === 'operator';
    //console.log ("🚀 user en Sales:", user);

    const [modalType, setModalType] = useState<'sales' | 'shipping' | null>(null);
    const [productAddModal, setProductAddModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0)
    const [sellers, setSellers] = useState([])
    const [selectedSellerId, setSelectedSellerId] = useState<number | undefined>(undefined);
    //const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [selectedProducts, setSelectedProducts, handleValueChange] = useEditableTable([])
    const [branches, setBranches] = useState([] as any[]);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [branchIdForFetch, setBranchIdForFetch] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<string>('all');
    const { data, fetchProducts } = useProductsFlat(
        branchIdForFetch && branchIdForFetch !== "undefined" ? branchIdForFetch : undefined
    );
    const [searchText, setSearchText] = useState("");
    const [sucursalesPagadas, setSucursalesPagadas] = useState<any[]>([]);
    useEffect(() => {
        const fetchSellerAndSetSucursales = async () => {
            if (isAdmin || isOperator || !user?.id_vendedor) return;

            try {
                const vendedor = await getSellerAPI(user.id_vendedor);

                if (vendedor?.pago_sucursales?.length > 0) {
                    const sucursales = vendedor.pago_sucursales.map((s: any) => ({
                        value: s.id_sucursal?.$oid || s.id_sucursal,
                        label: s.sucursalName,
                    }));
                    setSucursalesPagadas(sucursales);

                    // Si aún no hay seleccionada, usar la primera
                    if (!selectedBranchId) {
                        setSelectedBranchId(sucursales[0].value);
                    }
                }
            } catch (error) {
                message.error("No se pudo cargar las sucursales del vendedor");
            }
        };

        fetchSellerAndSetSucursales();
    }, [isAdmin, isOperator, user?.id_vendedor]);

    const [filteredBySeller, setFilteredBySeller] = useState<any[]>([]);

    useEffect(() => {
        if (!data || data.length === 0) {
            setFilteredBySeller([]);
            return;
        }

        const vendedoresVigentesIds = sellers.map((v: any) => String(v._id));

        let filtered = data.filter((p: any) => {
            if (p.stockActual <= 0 || selectedProduct !== 'all' && selectedProduct !== p.id_producto) return false;
            return vendedoresVigentesIds.includes(String(p.id_vendedor));
        });

        if ((isAdmin || isOperator) && selectedSellerId) {
            filtered = filtered.filter(p => String(p.id_vendedor) === String(selectedSellerId));
        } else if (!isAdmin || !isOperator) {
            filtered = filtered.filter(p => String(p.id_vendedor) === String(user.id_vendedor));
        }

        if (searchText.trim()) {
            const lower = searchText.trim().toLowerCase();
            const words = lower.split(" ");
            const specialChars = /[!@#$%^&*?:{}|<>]/

            const filterWords = (p: any, words: string[]) => {
                let match = true;
                for (const word of words) {
                    if (!match) return false;
                    if (specialChars.test(word)) continue;
                    match = match && (p.producto ?? '').toString().toLowerCase().includes(word);
                }
                return match;
            };

            filtered = filtered.filter(p => filterWords(p, words));
        }
        filtered = filtered.map((p: any) => {
            const vendedor = sellers.find((v: any) => String(v._id) === String(p.id_vendedor));
            return {
                ...p,
                vendedor: vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : "Sin vendedor"
            };
        });
        setFilteredBySeller(filtered);
    }, [data, selectedSellerId, isAdmin, isOperator, user?.id_vendedor, searchText, sellers, selectedProduct]);

    useEffect(() => {
        fetchSellers();
        fetchSucursal();
    }, []);
    useEffect(() => {
        if ((!isAdmin && !isOperator) && branches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(branches[0]._id);
        }
    }, [branches, isAdmin, isOperator, selectedBranchId]);
    useEffect(() => {
        const newSucursalId = (isAdmin || isOperator)
            ? localStorage.getItem("sucursalId")
            : selectedBranchId ?? (branches.length > 0 ? branches[0]._id : null);

        if (newSucursalId && newSucursalId !== branchIdForFetch) {
            setBranchIdForFetch(newSucursalId);
        }
    }, [branches, isAdmin, isOperator, selectedBranchId]); // ❌ sacá branchIdForFetch del array de dependencias

    const [productOptions, setProductOptions] = useState<JSX.Element[]>([])
    useEffect(() => {
        if (!data || data.length === 0) return

        const rawProducts = new Map<string,string>();
        data.forEach(product => {
            if(!rawProducts.has(product.id_producto) && product.id_vendedor == user.id_vendedor) {
                rawProducts.set(product.id_producto, product.producto.split(" - ")[0])
            }
        })
        const options: JSX.Element[] = [];
        rawProducts.forEach((value, key) => {
            options.push (
                <Select.Option key={key} value={key}>
                    {value}
                </Select.Option>
            )
        })
        setProductOptions(options)
    },[data, selectedSellerId, isAdmin, isOperator, user?.id_vendedor, searchText, sellers]);

    //console.log(" Productos desde useProductsFlat:", data);
    const [totalAmount, setTotalAmount] = useState<number>(0);

    useEffect(() => {
        if (selectedProducts.length > 0) {
            setSelectedProducts([]);
            setTotalAmount(0);
            message.info("La sucursal ha cambiado, se vació el carrito.");
        }
    }, [selectedBranchId]);

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
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const sucursalId = (isAdmin || isOperator)
                ? localStorage.getItem("sucursalId")
                : selectedBranchId ?? (branches.length > 0 ? branches[0]._id : null);

            if (!sucursalId) {
                console.warn("Sucursal ID no disponible aún para filtrar vendedores");
                setSellers([]);
                return;
            }

            const sellersVigentes = response.filter((v: any) => {
                return v.pago_sucursales?.some((pago: any) => {
                    const idSucursal = pago.id_sucursal?._id || pago.id_sucursal;
                    const perteneceASucursal = String(idSucursal) === String(sucursalId);

                    if (!perteneceASucursal) return false;

                    const fechaSalida = pago.fecha_salida
                        ? new Date(pago.fecha_salida)
                        : v.fecha_vigencia
                            ? new Date(v.fecha_vigencia)
                            : null;

                    if (fechaSalida) fechaSalida.setHours(0, 0, 0, 0);

                    return !fechaSalida || fechaSalida >= hoy;
                });
            });

            setSellers(sellersVigentes);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    };

    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsAPI()
            setBranches(response)
            if (isAdmin || isOperator) {
                const sucursalIdLogin = localStorage.getItem("sucursalId");
                if (sucursalIdLogin) {
                    setSelectedBranchId(sucursalIdLogin);
                }
            }

        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    }

    useEffect(() => {
        if ((!isAdmin && !isOperator)&& branches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(branches[0]._id);
        }
    }, [branches, isAdmin, isOperator, selectedBranchId]);

    const fallbackSucursalId = isAdmin || isOperator
        ? localStorage.getItem('sucursalId')
        : selectedBranchId ?? (branches.length > 0 ? branches[0]._id : null);

    useEffect(() => {
        if (!branchIdForFetch || branchIdForFetch === "undefined") return;
        fetchProducts();
    }, [branchIdForFetch]);

    useEffect(() => {
        if (branchIdForFetch) {
            fetchSellers();
        }
    }, [branchIdForFetch]);

    /*
    const filteredProducts = () => {

        let filteredData = data;
        const today = new Date();
        const vendedoresVigentesIds = sellers
            .filter(v => !v.fecha_vigencia || new Date(v.fecha_vigencia) >= new Date(today.setHours(0, 0, 0, 0)))
            .map(v => String(v._id));

        filteredData = filteredData.filter(p => vendedoresVigentesIds.includes(String(p.id_vendedor)));
        if (!isAdmin) {
            filteredData = filteredData.filter(p => String(p.id_vendedor) === String(user.id_vendedor));
            if (selectedBranchId) {
                filteredData = filteredData.filter(p => String(p.sucursalId) === String(selectedBranchId));
            }
        } else if (selectedSellerId) {
            filteredData = filteredData.filter(p => p.id_vendedor === selectedSellerId);
        }
        if (searchText.trim()) {
            const lowerSearch = searchText.toLowerCase();
            filteredData = filteredData.filter(product =>
                product.producto.toLowerCase().includes(lowerSearch)
            );
        }
        filteredData = filteredData.filter(product => product.stockActual > 0);

        //console.log(" Productos finales que se muestran:", filteredData);
        return filteredData;
    };
    */

    const handleProductSelect = (product: any) => {
        setSelectedProducts((prevProducts: any) => {
            const exists = prevProducts.find((p: any) => p.key === product.key);
            if (exists) return prevProducts;

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
                                        {!isAdmin && !isOperator && (
                                            <Select
                                                placeholder="Sucursal"
                                                value={selectedBranchId}
                                                onChange={(value) => setSelectedBranchId(value)}
                                                options={sucursalesPagadas}
                                                style={{ minWidth: 180 }}
                                                allowClear
                                            />
                                        )}
                                        {!isAdmin && !isOperator && (
                                            <Select
                                                    value={selectedProduct}
                                                    onChange={setSelectedProduct}
                                                    style={{ width: 180}}
                                            >
                                                <Select.Option key="all" value="all">Todos los productos</Select.Option>
                                                {productOptions}
                                            </Select>
                                        )}
                                        <Button
                                            type="primary"
                                            onClick={() => setProductAddModal(true)}
                                            className="text-mobile-base xl:text-desktop-sm "
                                        >
                                            Añadir nuevo producto
                                        </Button>
                                        {isAdmin || isOperator && (
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
                            data={filteredBySeller}
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
                                        {isAdmin || isOperator && (
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
                            handleValueChange={handleEnhancedValueChange}
                            onUpdateTotalAmount={updateTotalAmount}
                            key={refreshKey}
                            sellers={sellers}
                            isAdmin={isAdmin || isOperator}
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
                    isAdmin || isOperator 
                        ? sellers.find((s: any) => s._id === selectedSellerId) || null
                        : { _id: user?.id_vendedor, nombre: user?.nombre_vendedor?.split(" ")[0] || "", apellido: user?.nombre_vendedor?.split(" ")[1] || "" }
                }
                sellers={sellers}
                sucursalId={fallbackSucursalId}            />
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
                suc={fallbackSucursalId}
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
                isAdmin={isAdmin || isOperator}
                sellers={sellers}
                suc={fallbackSucursalId}
            />
        </>
    );
};

export default Sales;