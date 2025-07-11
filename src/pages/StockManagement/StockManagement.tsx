import React, { useContext, useEffect, useState } from 'react';
import {Row, Col, message} from 'antd';
import SellerList from './SellerList';
import ProductTable from './ProductTable';
import MoveProductsModal from './MoveProductsModal';
import { getFlatProductListAPI, getProductsAPI, registerVariantAPI } from '../../api/product';
import { Button, Input, Select, Spin } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
//import ProductInfoModal from '../Product/ProductInfoModal';
import ProductFormModal from '../Product/ProductFormModal';
import AddVariantModal from '../Product/AddVariantModal';
import { getGroupByIdAPI, getGroupsAPI } from '../../api/group';
import { getSellersAPI } from '../../api/seller';
import { getCategoriesAPI } from '../../api/category';
import { UserContext } from '../../context/userContext';
import ConfirmProductsModal from './ConfirmProductsModal';
import { createProductsFromGroup } from '../../services/createProducts';
import {saveTempStock, getTempProducts, getTempVariants, clearTempProducts,clearTempStock, clearTempVariants, reconstructProductFromFlat} from "../../utils/storageHelpers.ts";
import ProductTableSeller from "./ProductTableSeller.tsx";

const StockManagement = () => {
    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';
    const [stockListForConfirmModal, setStockListForConfirmModal] = useState([]);
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

    const [products, setProducts] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [productosFull, setProductosFull] = useState([]);
    useEffect(() => {
        if (!user || Object.keys(user).length === 0) return;


        if (isSeller) {
            setSucursalId("all");
        } else {
            const stored = localStorage.getItem("sucursalId");
            if (stored) setSucursalId(stored);
        }
    }, [user]);
    const fetchFullProducts = async () => {
        const fullData = await getProductsAPI();
        setProductosFull(fullData);
    };

    useEffect(() => {
        if (isConfirmModalVisible) {
            fetchFullProducts();
        }
    }, [isConfirmModalVisible]);

    useEffect(() => {
        fetchData();
    }, [sucursalId]);

    const fetchData = async () => {

        try {
            const sellersResponse = await getSellersAPI();
            const categoriesResponse = await getCategoriesAPI();
            const groupsResponse = await getGroupsAPI();

            let productsResponse = [];

            if (isSeller) {
                // VENDEDOR → usa getProductsAPI() y filtra
                const allProducts = await getProductsAPI();

                const filtered = allProducts.filter(p =>
                    p.id_vendedor?.toString() === user.id_vendedor &&
                    (sucursalId === "all" || p.sucursales?.some(s => s.id_sucursal?.toString() === sucursalId))
                );

                productsResponse = filtered;

                // Extraer sucursales del vendedor desde sus productos
                const sucursalesMap = new Map();
                filtered.forEach(prod => {
                    (prod.sucursales || []).forEach(suc => {
                        if (suc?.id_sucursal) {
                            sucursalesMap.set(suc.id_sucursal, {
                                id_sucursal: suc.id_sucursal,
                                nombre: suc.nombre || suc.id_sucursal
                            });
                        }
                    });
                });
                setSellerSucursales(Array.from(sucursalesMap.values()));
            } else {
                // ADMIN → necesita sucursalId válido
                const idToUse = localStorage.getItem("sucursalId");
                if (!idToUse || idToUse.length !== 24) {
                    console.warn("❌ ID de sucursal inválido o ausente:", idToUse);
                    message.error("Sucursal no seleccionada o inválida.");
                    setProducts([]);
                    return;
                }

                productsResponse = await getFlatProductListAPI(idToUse);
            }


            setSellers(sellersResponse);
            setCategories(categoriesResponse);
            setGroups(groupsResponse);
            setProducts(productsResponse);
            setFilteredProducts(productsResponse);
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            message.error("Ocurrió un error al cargar los datos.");
        }
    };

    useEffect(() => {
        clearTempStock();
        clearTempProducts();
        clearTempVariants();
        fetchData();
        fetchFullProducts(); // ← cargamos el listado completo al inicio
    }, []);

    useEffect(() => {
        filter();
    }, [selectedSeller]);

    useEffect(() => {
        fetchData();
    }, [prevKey]);

    useEffect(() => {
        const newOptions = [
            {
                option: 'Categoria',
                filter: filterByCategoria,
                group: categories,
                groupFunction: (category, products) =>
                    products.filter((product) => product.id_categoria == category._id)
            },
            {
                option: 'Grupo',
                filter: filterByGroup,
                group: groups,
                groupFunction: (group, products) =>
                    products.filter((product) => product.groupId == group._id)
            }
        ];

        if (!isSeller) {
            newOptions.unshift({
                option: 'Vendedor',
                filter: filterBySeller,
                group: sellers,
                groupFunction: (seller, products) =>
                    products.filter((product) => product.id_vendedor == seller._id)
            });
        }

        setOptions(newOptions);

        // NUEVO: aplicar filtro por defecto cuando se cargan
        setTimeout(() => filter(), 100);
    }, [sellers, categories, groups]);
    const finalProductList = isSeller
        ? products.filter(product => product.id_vendedor?.toString() === user.id_vendedor)
        : filteredProducts;

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
        await fetchData();
        setFilteredProducts(products);
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
        setProducts([...products, newVariant.product]);
        setFilteredProducts([...filteredProducts, newVariant.product]);
        setNewVariants([...newVariants, newVariant]);
        closeModal();
    };

    const showModal = (product: any) => {
        setSelectedProduct(product);
        setInfoModalVisible(true);
    };

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
        const selectedOption = options[criteriaFilter];
        if (!selectedOption || !selectedOption.filter) return;
        const newList = products.filter(product => selectedOption.filter(product, selectedSeller));

        setFilteredProducts(newList);
        setProductsToUpdate({});
        setStockListForConfirmModal([]);

    };


    const handleChangeFilter = (index: number) => {
        setCriteriaFilter(index);
    };

    const handleChangeGroup = (index: number) => {
        setCriteriaGroup(index);
    };

    const saveNewProducts = async (productData, combinations, selectedFeatures, features) => {
        const newProduct = {
            productData,
            combinations,
            selectedFeatures,
            features,
            isNew: true // Marcar como nuevo
        };

        // Guardar en localStorage
        const stored = JSON.parse(localStorage.getItem("newProducts") || "[]");
        localStorage.setItem("newProducts", JSON.stringify([...stored, newProduct]));

        // Actualizar estado para UI
        setNewProducts(prev => [...prev, newProduct]);
        setProductFormVisible(false);
    };
    const controlSpan = isSeller ? { xs: 24, sm: 12, lg: 8 } : { xs: 24, sm: 12, lg: 6 };

    const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

    const handleMoveSuccess = () => {
        fetchData();
        setIsMoveModalVisible(false);
    };

    return (

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src="/inventory-icon.png" alt="Inventario" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Gestión de Inventario
                    </h1>
                </div>
            </div>

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
                    onUpdateProducts={fetchData}
                    sucursalId={sucursalId}
                    setSucursalId={setSucursalId}
                />
            ) : (
                <ProductTable
                    productsList={finalProductList}
                    groupList={options[criteriaFilter]?.group || []}
                    onUpdateProducts={fetchData}
                    setStockListForConfirmModal={setStockListForConfirmModal}
                    resetSignal={resetSignal}
                    searchText={searchText}
                    setSearchText={setSearchText}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedSeller={selectedSeller}
                    onShowVariantModal={showVariantModal}
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
                        await fetchData(); // Recarga productos desde backend
                        setProductFormVisible(false); // Cierra modal
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
                    onSuccess={handleMoveSuccess}
                    products={products}
                />
            )}
        </div>

    );
};

export default StockManagement;