import { useContext, useEffect, useState } from 'react';
import { Row, Col, message } from 'antd';
import { useQuery } from "@tanstack/react-query";
import SellerList from './SellerList';
import ProductTable from './ProductTable';
import MoveProductsModal from './MoveProductsModal';
import { getFlatProductListAPI } from '../../api/product';
import { Button, Input, Select } from 'antd';
//import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
//import ProductInfoModal from '../Product/ProductInfoModal';
import ProductFormModal from '../Product/ProductFormModal';
import AddVariantModal from '../Product/AddVariantModal';
import { getGroupsAPI } from '../../api/group';
import { getSellersAPI } from '../../api/seller';
import { getCategoriesAPI } from '../../api/category';
import { UserContext } from '../../context/userContext';
import ConfirmProductsModal from './ConfirmProductsModal';
//import { createProductsFromGroup } from '../../services/createProducts';
import { saveTempStock, getTempProducts, getTempVariants, clearTempProducts, clearTempStock, clearTempVariants, reconstructProductFromFlat } from "../../utils/storageHelpers.ts";
import ProductTableSeller from "./ProductTableSeller.tsx";
import PageTemplate from "../../components/PageTemplate";
//test
const StockManagement = () => {
    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';
    const [stockListForConfirmModal, setStockListForConfirmModal] = useState<any[]>([]);
    const [resetSignal, setResetSignal] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedGroup, setSelectedGroup] = useState<{ product: any; name: string } | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
    const [isProductFormVisible, setProductFormVisible] = useState<boolean>(false);
    const [isVariantModalVisible, setIsVariantModalVisible] = useState<boolean>(false);
    const [prevKey, setPrevKey] = useState(0);
    const [criteriaFilter, setCriteriaFilter] = useState(0);
    const [criteriaGroup, setCriteriaGroup] = useState(0);
    const [sucursalId, setSucursalId] = useState<string>("all");
    const [sellerSucursales, setSellerSucursales] = useState<any[]>([]);

    const [options, setOptions] = useState<any[]>([{ option: "Vendedor", group: [], groupFunction: () => { } }]);
    const [productsToUpdate, setProductsToUpdate] = useState<{ [key: number]: number }>({});
    const [stock, setStock] = useState([]);
    const [newProducts, setNewProducts] = useState<any[]>([]);
    const [newVariants, setNewVariants] = useState<any[]>([]);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

    const [sellers, setSellers] = useState<any[]>([]);

    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [productosFull, setProductosFull] = useState([]);
    const [sellersVigentes, setSellersVigentes] = useState<any[]>([]);
    const handleSellersLoaded = (listaVigente: any[]) => {
        setSellersVigentes(listaVigente.filter(s => s._id));
    };

    const getFilteredProducts = () => {
        if (
            !productsQuery ||
            !groups ||
            !categories ||
            !options ||
            options.length === 0 ||
            sellersVigentes.length === 0
        ) return [];
        const selectedOption = options[criteriaFilter];
        if (!selectedOption || !selectedOption.filter) return [];

        const vendedoresPermitidos = sellersVigentes.map(v => String(v._id));
        return productsQuery
            .filter((product: any) => vendedoresPermitidos.includes(String(product.id_vendedor)))
            .filter((product: any) => selectedOption.filter(product, selectedSeller));
    };

    const { data: groups = [], isLoading: loadingGroups } = useQuery({
        queryKey: ["groups"],
        queryFn: getGroupsAPI,
        staleTime: 1000 * 60 * 5
    });

    const { data: categories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ["categories"],
        queryFn: getCategoriesAPI,
        staleTime: 1000 * 60 * 5
    });

    const { data: productsQuery = [], isLoading: loadingProducts, refetch } = useQuery({
        queryKey: ["products", sucursalId, isSeller ? user.id_vendedor : null],
        queryFn: () =>
            getFlatProductListAPI(sucursalId).then((flatProducts) =>
                isSeller
                    ? flatProducts.filter((p: any) => p.id_vendedor?.toString() === user.id_vendedor)
                    : flatProducts
            ),
        enabled: !!sucursalId && sucursalId !== "" && sucursalId !== "all",
        staleTime: 1000 * 60 * 5,
    });
    useEffect(() => {
        if (!user || Object.keys(user).length === 0) return;

        if (isSeller) {
            setSucursalId(user.sucursales?.[0]?._id || "");
        } else {
            const stored = localStorage.getItem("sucursalId");
            if (stored) {
                setSucursalId(stored);
            } else if (user.sucursales?.length) {
                setSucursalId(user.sucursales[0]._id);
            } else if (user.sucursales && user.sucursales.length === 0) {
                setSucursalId("");
            }
        }
    }, [user]);

    useEffect(() => {
        // Solo ejecuta fetchData si sucursalId tiene un valor válido
        if (!sucursalId || sucursalId === "") return;
        fetchData();
    }, [sucursalId]);

    const fetchData = async () => {
        try {
            const sellersResponse = await getSellersAPI();

            setSellers(sellersResponse);
            // NO: setProducts ni setFilteredProducts aquí
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            message.error("Ocurrió un error al cargar los datos.");
        }
    };

    useEffect(() => {
        clearTempStock();
        clearTempProducts();
        clearTempVariants();
    }, []);

    // useEffect(() => {
    //     filter();
    // }, [productsQuery, groups, categories, selectedSeller, options, criteriaFilter]);

    useEffect(() => {
        fetchData();
    }, [prevKey]);

    useEffect(() => {
        const newOptions = [
            {
                option: 'Categoria',
                filter: filterByCategoria,
                group: categories,
                groupFunction: (category: any, productsQuery: any[]) =>
                    productsQuery.filter((productsQuery) => productsQuery.id_categoria == category._id)
            },
            {
                option: 'Grupo',
                filter: filterByGroup,
                group: groups,
                groupFunction: (group: any, productsQuery: any[]) =>
                    productsQuery.filter((productsQuery) => productsQuery.groupId == group._id)
            }
        ];

        if (!isSeller) {
            newOptions.unshift({
                option: 'Vendedor',
                filter: filterBySeller,
                group: sellers,
                groupFunction: (seller, productsQuery) =>
                    productsQuery.filter((product) => product.id_vendedor == seller._id)
            });
        }

        setOptions(newOptions);
    }, [sellers, categories, groups]);

    const finalProductList = isSeller
        ? (productsQuery || []).filter((product: any) => product.id_vendedor?.toString() === user.id_vendedor)
        : filteredProducts || [];

    //console.log("Productos originales:", products);
    //console.log("🧪 Productos filtrados:", finalProductList);
    const showVariantModal = async (product: any) => {
        if (!product) return;

        const sucursalId = localStorage.getItem("sucursalId");
        const rebuiltProduct = reconstructProductFromFlat({
            flatProducts: productosFull,
            productId: product._id,
            sucursalId
        });

        if (!rebuiltProduct) {
            return message.error("No se pudo reconstruir el producto.");
        }

        const group = {
            name: product.nombre_producto,
            product: rebuiltProduct
        };

        setSelectedGroup(group);
        setIsVariantModalVisible(true);
    };

    const closeConfirmProduct = async () => {
        await refetch();
        clearTempProducts();
        clearTempVariants();
        setProductsToUpdate({});
        setStockListForConfirmModal([]);
        setIsConfirmModalVisible(false);
    };

    const cancelConfirmProduct = async () => {
        setIsConfirmModalVisible(false);
    };

    const succesAddVariant = async (newVariant) => {
        setFilteredProducts([...filteredProducts, newVariant.product]);
        setNewVariants([...newVariants, newVariant]);
        closeModal();
    };

    // const showModal = (product: any) => {
    //     setSelectedProduct(product);
    //     setInfoModalVisible(true);
    // };

    const closeModal = () => {
        setSelectedProduct(null);
        setInfoModalVisible(false);
        setSelectedGroup(null);
        setIsVariantModalVisible(false);
    };

    const filterBySeller = (product, sellerId) => {
        const sucursalId = localStorage.getItem("sucursalId");

        return sellerId === null || product.id_vendedor === sellerId;
    };
    const filterByCategoria = (product, sellerId) => {
        return sellerId === null || product.id_categoria === sellerId;
    };

    const filterByGroup = (product, sellerId) => {
        return sellerId === null || product.groupId === sellerId;
    };

    const handleSelectSeller = (sellerId: any) => {
        setSelectedSeller(sellerId);
    };

    const filter = () => {
        if (!productsQuery || !groups || !categories || sellersVigentes.length === 0) return;
        const selectedOption = options[criteriaFilter];
        if (!selectedOption || !selectedOption.filter) return;

        const vendedoresPermitidos = sellersVigentes.map(v => String(v._id));
        const newList = productsQuery
            .filter((product: any) => vendedoresPermitidos.includes(String(product.id_vendedor)))
            .filter((product: any) => selectedOption.filter(product, selectedSeller));

        setFilteredProducts(newList);
        setProductsToUpdate({});
        setStockListForConfirmModal([]);
    };
    useEffect(() => {
        if (sellers.length > 0) {
            setSellersVigentes(sellers.filter(s => s._id));
        }
    }, [sellers]);
    // const handleChangeFilter = (index: number) => {
    //     setCriteriaFilter(index);
    // };

    // const handleChangeGroup = (index: number) => {
    //     setCriteriaGroup(index);
    // };

    // const saveNewProducts = async (productData, combinations, selectedFeatures, features) => {
    //     const newProduct = {
    //         productData,
    //         combinations,
    //         selectedFeatures,
    //         features,
    //         isNew: true // Marcar como nuevo
    //     };

    //     // Guardar en localStorage
    //     const stored = JSON.parse(localStorage.getItem("newProducts") || "[]");
    //     localStorage.setItem("newProducts", JSON.stringify([...stored, newProduct]));

    //     // Actualizar estado para UI
    //     setNewProducts(prev => [...prev, newProduct]);
    //     setProductFormVisible(false);
    // };
    // const controlSpan = isSeller ? { xs: 24, sm: 12, lg: 8 } : { xs: 24, sm: 12, lg: 6 };

    const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

    if (
        loadingGroups ||
        loadingCategories ||
        loadingProducts ||
        !options ||
        options.length === 0 ||
        sellersVigentes.length === 0
    ) {
        return <div>Cargando datos...</div>;
    }
    return (
        <PageTemplate
            title="Gestión de Inventario"
            iconSrc="/inventory-icon.png"
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {isSeller ? (
                    <h2 style={{ fontSize: "1.5rem", textAlign: "center", marginBottom: 24, fontWeight: 600 }}>
                        Productos de {user?.nombre_vendedor || 'Vendedor'}
                    </h2>
                ) : (
                    <div className="block xl:flex justify-center">
                        <h2 className='text-mobile-3xl xl:text-mobile-3xl mr-4'>Lista de Productos</h2>
                        {/*
                        <Select
                            style={{ width: 200 }}
                            placeholder="Select an option"
                            onChange={handleChangeFilter}
                            defaultValue={0}
                        >
                            {options.map((option, index) => (
                                <Select.Option key={option.option} value={index}>
                                    {option.option}
                                </Select.Option>
                            ))}
                        </Select>
                        */}
                    </div>
                )}

                {!isSeller && (
                    <div className="bg-white rounded-xl px-5 py-4 shadow-md mb-4">
                        <Row gutter={[16, 16]} align="middle" justify="center">
                            <Col xs={24} sm={12} lg={6}>
                                <SellerList
                                    filterSelected={criteriaFilter}
                                    onSelectSeller={handleSelectSeller}
                                    onSellersLoaded={handleSellersLoaded}
                                />
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Button
                                    onClick={() => setProductFormVisible(true)}
                                    type="primary"
                                    block
                                    disabled={!selectedSeller}
                                    title={!selectedSeller ? "Debe seleccionar un vendedor primero" : undefined}
                                    className="text-mobile-base xl:text-mobile-base"
                                >
                                    Agregar Producto
                                </Button>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Button
                                    onClick={() => {
                                        const stockMapped = stockListForConfirmModal.map(item => ({
                                            ...item,
                                            product: {
                                                ...item.product,
                                                variantes: item.product.variantes || item.product.variantes_obj || {}
                                            }
                                        }));

                                        saveTempStock(stockMapped);
                                        setStock(stockListForConfirmModal);
                                        setIsConfirmModalVisible(true);
                                    }}
                                    block
                                    disabled={!selectedSeller}
                                    title={!selectedSeller ? "Debe seleccionar un vendedor primero" : undefined}
                                    className="text-mobile-base xl:text-mobile-base"
                                >
                                    Actualizar Stock
                                </Button>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Input.Search
                                    placeholder="Buscar producto o variante..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    allowClear
                                    className="w-full"
                                />
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Select
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                    className="w-full"
                                >
                                    <Select.Option value="all">Todas las categorías</Select.Option>
                                    {categories.map((cat) => (
                                        <Select.Option key={cat._id} value={cat._id}>
                                            {cat.categoria}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                    </div>
                )}
                <Row gutter={[16, 16]} justify="center" align="middle" style={{ marginBottom: "16px" }}>


                    {/*!isSeller && (
                        <>
                            <Col xs={24} sm={12} lg={6}>
                                <Button
                                    onClick={() => setProductFormVisible(true)}
                                    type="primary"
                                    className='text-mobile-base xl:text-mobile-base'
                                >
                                    Agregar Producto
                                </Button>
                            </Col>
                            {
                            <Col xs={24} sm={12} lg={6}>
                                <Button
                                    onClick={() => setIsMoveModalVisible(true)}
                                    type="default"
                                    className='text-mobile-base xl:text-mobile-base'
                                >
                                    Mover Productos
                                </Button>
                            </Col>
                            }
                        </>
                    )*/}
                    {/*!isSeller && (
                        <Col {...controlSpan}>
                            <Button
                                onClick={() => {
                                    saveTempStock(stockListForConfirmModal);
                                    setStock(stockListForConfirmModal);
                                    setIsConfirmModalVisible(true);
                                }}
                                className='text-mobile-base xl:text-mobile-base'
                            >
                                Actualizar Stock
                            </Button>
                        </Col>
                    )*/}
                </Row>
                {isSeller ? (
                    <ProductTableSeller
                        productsList={finalProductList}
                        onUpdateProducts={refetch}
                        sucursalId={sucursalId}
                        setSucursalId={setSucursalId}
                    />
                ) : (
                    <ProductTable
                        productsList={getFilteredProducts()}
                        groupList={options[criteriaFilter]?.group || []}
                        onUpdateProducts={async () => { await refetch(); }}
                        setStockListForConfirmModal={setStockListForConfirmModal}
                        resetSignal={resetSignal}
                        searchText={searchText}
                        setSearchText={setSearchText}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        selectedSeller={selectedSeller}
                        onShowVariantModal={showVariantModal}
                        sellersVigentes={sellersVigentes}
                    />

                )}

                {/*infoModalVisible && (
                    <ProductInfoModal
                        visible={infoModalVisible}
                        onClose={closeModal}
                        product={selectedProduct}
                    />
                )*/}

                {isProductFormVisible && (
                    <ProductFormModal
                        visible={isProductFormVisible}
                        onCancel={() => setProductFormVisible(false)}
                        onSuccess={async () => {
                            await refetch(); // Refresca productos
                            setProductFormVisible(false);
                        }}
                        selectedSeller={sellers.find(s => s._id === selectedSeller)}
                    />
                )}

                {isVariantModalVisible && (
                    <AddVariantModal
                        group={selectedGroup}
                        onAdd={succesAddVariant}
                        onCancel={closeModal}
                        visible={isVariantModalVisible}
                    />
                )}

                {isConfirmModalVisible && (
                    <ConfirmProductsModal
                        visible={isConfirmModalVisible}
                        onClose={cancelConfirmProduct}
                        onSuccess={() => {
                            closeConfirmProduct();
                            setProductsToUpdate({});
                            setStockListForConfirmModal([]);
                            setResetSignal(true);
                            setTimeout(() => setResetSignal(false), 100);
                        }}
                        newVariants={getTempVariants()}
                        newProducts={getTempProducts()}
                        newStock={stockListForConfirmModal}
                        productosConSucursales={productosFull}
                        selectedSeller={sellers.find(s => s._id === selectedSeller)}
                    />
                )}
                {isMoveModalVisible && (
                    <MoveProductsModal
                        visible={isMoveModalVisible}
                        onClose={() => setIsMoveModalVisible(false)}
                        onSuccess={async () => {
                            await refetch();
                            setIsMoveModalVisible(false);
                        }}
                        products={productsQuery || []}
                    />
                )}
            </div>
        </PageTemplate>
    );
};

export default StockManagement;
