import React, { useContext, useEffect, useState } from 'react';
import {Row, Col, message} from 'antd';

import SellerList from './SellerList';
import ProductTable from './ProductTable';
import MoveProductsModal from './MoveProductsModal';
import { getFlatProductListAPI, getSellerInventoryAllAPI, getProductsAPI } from '../../api/product';
import { Button, Input, Select, Spin } from 'antd';
import { InfoCircleOutlined, PlusOutlined, QrcodeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
//import ProductInfoModal from '../Product/ProductInfoModal';
import ProductFormModal from '../Product/ProductFormModal';
import AddVariantModal from '../Product/AddVariantModal';
import { getGroupByIdAPI, getGroupsAPI } from '../../api/group';
import { getSellersBasicAPI } from '../../api/seller';
import { getCategoriesAPI } from '../../api/category';
import { UserContext } from '../../context/userContext';
import ConfirmProductsModal from './ConfirmProductsModal';
import { createProductsFromGroup } from '../../services/createProducts';
import {saveTempStock, getTempProducts, getTempVariants, clearTempProducts,clearTempStock, clearTempVariants, reconstructProductFromFlat} from "../../utils/storageHelpers.ts";
import ProductTableSeller from "./ProductTableSeller.tsx";
import VariantQRBatchModal from "./VariantQRBatchModal.tsx";
import InventoryQRModal from "./InventoryQRModal.tsx";
import StockQRInfoModal from "./StockQRInfoModal.tsx";
//test
const SELLERS_PAGE_SIZE = 10;

const StockManagement = () => {
    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';
    const [stockListForConfirmModal, setStockListForConfirmModal] = useState([]);
    const [resetSignal, setResetSignal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedGroup, setSelectedGroup] = useState<{ product: any; name: string } | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
    const [isProductFormVisible, setProductFormVisible] = useState<boolean>(false);
    const [isVariantModalVisible, setIsVariantModalVisible] = useState<boolean>(false);
    const [prevKey, setPrevKey] = useState(0);
    const [sucursalId, setSucursalId] = useState<string>("all");
    const [sellerSucursales, setSellerSucursales] = useState<any[]>([]);
    const [productsToUpdate, setProductsToUpdate] = useState<{ [key: number]: number }>({});
    const [stock, setStock] = useState([]);
    const [newProducts, setNewProducts] = useState<any[]>([]);
    const [newVariants, setNewVariants] = useState<any[]>([]);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [isQRBatchModalVisible, setIsQRBatchModalVisible] = useState(false);
    const [qrModalProductIds, setQrModalProductIds] = useState<string[]>([]);
    const [qrModalAutoGenerate, setQrModalAutoGenerate] = useState(false);
    const [isInventoryQRModalVisible, setIsInventoryQRModalVisible] = useState(false);
    const [isStockQRInfoModalVisible, setIsStockQRInfoModalVisible] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [productosFull, setProductosFull] = useState([]);
    const [sellersVigentes, setSellersVigentes] = useState<any[]>([]);
    const [inventoryPage, setInventoryPage] = useState(1);
    const [inventoryTotal, setInventoryTotal] = useState(0);
    const [hasMoreInventory, setHasMoreInventory] = useState(false);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const isSellerActiveInBranch = (seller: any, branchId: string) => {
        if (!branchId) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (seller?.pago_sucursales || []).some((pago: any) => {
            const idSucursal = pago?.id_sucursal?._id || pago?.id_sucursal;
            if (String(idSucursal) !== String(branchId)) return false;
            const rawExit = pago?.fecha_salida || seller?.fecha_vigencia;
            if (!rawExit) return true;
            const exit = new Date(rawExit);
            exit.setHours(0, 0, 0, 0);
            return exit >= today;
        });
    };

    const buildVigentesForBranch = (sellersList: any[], branchId: string) => {
        const vigentes = (Array.isArray(sellersList) ? sellersList : [])
            .filter((seller) => isSellerActiveInBranch(seller, branchId))
            .map((seller) => ({
                ...seller,
                name: `${seller?.marca?.trim() || "Sin marca"} - ${seller?.nombre || ""} ${seller?.apellido || ""}`.trim()
            }));
        return [{ _id: null, name: "Todos" }, ...vigentes];
    };










































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
        if (!isSeller && isConfirmModalVisible) {
            fetchFullProducts();
        }
    }, [isConfirmModalVisible, isSeller]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(searchText.trim());
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchText]);

    const fetchStaticData = async () => {
        try {
            const categoriesResponse = await getCategoriesAPI();
            setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);

            if (isSeller) {
                const sellerBasic = await getSellersBasicAPI();
                const seller = Array.isArray(sellerBasic) && sellerBasic.length > 0 ? sellerBasic[0] : null;
                const sucursales = (seller?.pago_sucursales || []).map((p: any) => ({
                    _id: String(p.id_sucursal?._id || p.id_sucursal),
                    nombre: p.sucursalName || "Sucursal"
                }));
                setSellerSucursales(sucursales);
            } else {
                const [sellersResponse, groupsResponse] = await Promise.all([
                    getSellersBasicAPI(),
                    getGroupsAPI()
                ]);
                const branchId = String(localStorage.getItem("sucursalId") || "");
                const sellersList = Array.isArray(sellersResponse) ? sellersResponse : [];
                const sellersVigentesList = buildVigentesForBranch(sellersList, branchId);
                setSellers(sellersVigentesList);
                setSellersVigentes(sellersVigentesList.filter((s: any) => s?._id));
                if (
                    selectedSeller &&
                    !sellersVigentesList.some((s: any) => String(s?._id) === String(selectedSeller))
                ) {
                    setSelectedSeller(null);
                }
                setGroups(Array.isArray(groupsResponse) ? groupsResponse : []);
            }
        } catch (error) {
            console.error("Error al cargar datos base:", error);
            message.error("No se pudieron cargar los datos base del inventario.");
        }
    };

    const fetchInventoryPage = async (reset = false) => {
        try {
            setIsLoadingInventory(true);

            if (isSeller) {
                const rows = await getSellerInventoryAllAPI({
                    sucursalId: sucursalId && sucursalId !== "all" ? sucursalId : undefined,
                    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
                    q: debouncedSearch || undefined
                });
                const safeRows = Array.isArray(rows) ? rows : [];
                setProducts(safeRows);
                setInventoryPage(1);
                setInventoryTotal(safeRows.length);
                setHasMoreInventory(false);
                return;
            }

            const branchId =
                sucursalId && sucursalId !== "all"
                    ? sucursalId
                    : String(localStorage.getItem("sucursalId") || "");
            if (!branchId || branchId.length !== 24) {
                console.warn("ID de sucursal invalido o ausente:", branchId);
                message.error("Sucursal no seleccionada o invalida.");
                setProducts([]);
                setHasMoreInventory(false);
                return;
            }

            if (selectedSeller) {
                const rows = await getFlatProductListAPI({
                    sucursalId: branchId,
                    sellerId: String(selectedSeller),
                    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
                    q: debouncedSearch || undefined
                });
                const safeRows = Array.isArray(rows) ? rows : [];
                setProducts(safeRows);
                setInventoryPage(1);
                setInventoryTotal(1);
                setHasMoreInventory(false);
                return;
            }

            const sellerIds = sellersVigentes.map((s: any) => String(s._id));
            const nextPage = reset ? 1 : inventoryPage + 1;
            const sliceStart = (nextPage - 1) * SELLERS_PAGE_SIZE;
            const batchSellerIds = sellerIds.slice(sliceStart, sliceStart + SELLERS_PAGE_SIZE);
            if (batchSellerIds.length === 0) {
                if (reset) {
                    setProducts([]);
                }
                setHasMoreInventory(false);
                setInventoryTotal(sellerIds.length);
                return;
            }

            const rows = await getFlatProductListAPI({
                sucursalId: branchId,
                sellerIds: batchSellerIds,
                categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
                q: debouncedSearch || undefined
            });
            const safeRows = Array.isArray(rows) ? rows : [];
            const nextRows = reset ? safeRows : [...products, ...safeRows];
            setProducts(nextRows);
            setInventoryPage(nextPage);
            setInventoryTotal(sellerIds.length);
            setHasMoreInventory(nextPage * SELLERS_PAGE_SIZE < sellerIds.length);
        } catch (error) {
            console.error("Error al cargar inventario:", error);
            message.error("Ocurrio un error al cargar el inventario.");
        } finally {
            setIsLoadingInventory(false);
        }
    };

    useEffect(() => {
        clearTempStock();
        clearTempProducts();
        clearTempVariants();
        fetchStaticData();
        if (!isSeller) {
            fetchFullProducts();
        }
    }, [isSeller]);

    useEffect(() => {
        if (isSeller) {
            if (sellerSucursales.length === 0) return;
            const current = String(sucursalId || "");
            const hasValidBranch = sellerSucursales.some((s: any) => String(s._id) === current);
            if (!hasValidBranch) return;
        }
        if (!isSeller && (!sucursalId || sucursalId === "all")) return;
        if (!isSeller && !selectedSeller && sellersVigentes.length === 0) return;
        fetchInventoryPage(true);
    }, [isSeller, sucursalId, selectedSeller, selectedCategory, debouncedSearch, prevKey, sellersVigentes, sellerSucursales]);

    useEffect(() => {
        if (!isSeller || sellerSucursales.length === 0) return;
        const current = String(sucursalId || "");
        const exists = sellerSucursales.some((s: any) => String(s._id) === current);
        if (!exists) {
            setSucursalId(String(sellerSucursales[0]._id));
        }
    }, [isSeller, sellerSucursales, sucursalId]);

    const handleLoadMoreInventory = async () => {
        if (isLoadingInventory || !hasMoreInventory) return;
        await fetchInventoryPage(false);
    };
    const finalProductList = products;

    //console.log("Productos originales:", products);
    //console.log("?? Productos filtrados:", finalProductList);
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
        await fetchInventoryPage(true);
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

    const handleSelectSeller = (sellerId: string | null) => {
        setSelectedSeller(sellerId);
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
        fetchInventoryPage(true);
        setIsMoveModalVisible(false);
    };

    const actionButtonStyle: React.CSSProperties = {
        height: 44,
        borderRadius: 12,
        fontWeight: 600
    };

    const generateActionButtonStyle: React.CSSProperties = {
        ...actionButtonStyle,
        background: "linear-gradient(135deg, #ff9b45 0%, #ff7f2a 100%)",
        borderColor: "#ff8b34",
        color: "#ffffff"
    };

    const buildDraftKey = (item: any) => {
        const productId = String(item?.product?._id || item?.product?.id_producto || "");
        const variantKey = String(item?.product?.variantKey || "");
        const variantHash = JSON.stringify(item?.product?.variantes || item?.product?.variantes_obj || {});
        return `${productId}::${variantKey || variantHash}`;
    };

    const mergeStockDrafts = (baseDraft: any[], incomingDraft: any[]) => {
        const nextMap = new Map<string, any>();

        [...(baseDraft || []), ...(incomingDraft || [])].forEach((item) => {
            nextMap.set(buildDraftKey(item), item);
        });

        return Array.from(nextMap.values());
    };

    const selectedSellerRecord = !isSeller
        ? sellers.find((seller: any) => String(seller?._id) === String(selectedSeller || ""))
        : null;
    const effectiveSellerId = isSeller ? String(user?.id_vendedor || "") : String(selectedSeller || "");
    const effectiveSellerLabel = isSeller
        ? String(user?.nombre_vendedor || "Vendedor")
        : String(selectedSellerRecord?.name || "Vendedor");
    const effectiveBranchId = isSeller
        ? (sucursalId !== "all" ? String(sucursalId || "") : "")
        : String((sucursalId && sucursalId !== "all" ? sucursalId : localStorage.getItem("sucursalId")) || "");
    const effectiveBranchLabel = isSeller
        ? String(
            sellerSucursales.find((branch: any) => String(branch?._id) === String(effectiveBranchId))?.nombre ||
            "Sucursal actual"
        )
        : "Sucursal actual";
    const qrToolsDisabled = !effectiveSellerId || !effectiveBranchId;

    const openConfirmWithDraft = (draft: any[]) => {
        const mergedDraft = mergeStockDrafts(stockListForConfirmModal, draft);
        saveTempStock(mergedDraft);
        setStockListForConfirmModal(mergedDraft);
        setStock(mergedDraft);
        setIsConfirmModalVisible(true);
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
                <div
                    className="bg-white rounded-xl px-4 py-4 shadow-md mb-4"
                    style={{ border: "1px solid #f1ece4" }}
                >
                    <div data-stock-filters="true">
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                marginBottom: 12
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#1f1f1f" }}>
                                    Filtros
                                </div>
                            </div>
                        <div
                            style={{
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: selectedSeller ? "#f6ffed" : "#fafafa",
                                    color: selectedSeller ? "#237804" : "#8c8c8c",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: selectedSeller ? "1px solid #b7eb8f" : "1px solid #e8e8e8"
                                }}
                            >
                                {selectedSeller ? "Vendedor seleccionado" : "Selecciona vendedor para editar stock"}
                            </div>
                            <div
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: qrToolsDisabled ? "#fafafa" : "#f6ffed",
                                    color: qrToolsDisabled ? "#8c8c8c" : "#237804",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: qrToolsDisabled ? "1px solid #e8e8e8" : "1px solid #b7eb8f"
                                }}
                            >
                                {qrToolsDisabled ? "Selecciona contexto para usar QR" : "QR listo para esta sucursal"}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div>
                            <SellerList
                                sellers={sellers}
                                selectedSeller={selectedSeller}
                                onSelectSeller={handleSelectSeller}
                            />
                        </div>
                        <div>
                            <Button
                                onClick={() => setProductFormVisible(true)}
                                type="default"
                                icon={<PlusOutlined />}
                                block
                                disabled={!selectedSeller}
                                title={!selectedSeller ? "Debe seleccionar un vendedor primero" : undefined}
                                className="text-mobile-base xl:text-mobile-base"
                                style={actionButtonStyle}
                            >
                                Agregar producto
                            </Button>
                        </div>
                        <div>
                            <Button
                                onClick={() => {
                                    setQrModalProductIds([]);
                                    setQrModalAutoGenerate(false);
                                    setIsQRBatchModalVisible(true);
                                }}
                                type="primary"
                                icon={<QrcodeOutlined />}
                                block
                                className="text-mobile-base xl:text-mobile-base"
                                style={generateActionButtonStyle}
                            >
                                Generar
                            </Button>
                        </div>
                        <div>
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
                                icon={<ReloadOutlined />}
                                style={actionButtonStyle}
                            >
                                Actualizar stock
                            </Button>
                        </div>
                        <div>
                            <Button
                                icon={<QrcodeOutlined />}
                                block
                                style={actionButtonStyle}
                                disabled={qrToolsDisabled}
                                onClick={() => setIsInventoryQRModalVisible(true)}
                                title={qrToolsDisabled ? "Debe seleccionar un vendedor primero" : undefined}
                            >
                                Inventario QR
                            </Button>
                        </div>
                        <div>
                            <Button
                                icon={<InfoCircleOutlined />}
                                block
                                style={actionButtonStyle}
                                disabled={qrToolsDisabled}
                                onClick={() => setIsStockQRInfoModalVisible(true)}
                                title={qrToolsDisabled ? "Debe seleccionar un vendedor primero" : undefined}
                            >
                                Informacion QR
                            </Button>
                        </div>
                        <div>
                            <Input.Search
                                placeholder="Buscar producto o variante..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                                className="w-full"
                                size="large"
                            />
                        </div>
                        <div>
                            <Select
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                className="w-full"
                                size="large"
                            >
                                <Select.Option value="all">Todas las categorías</Select.Option>
                                {categories.map((cat) => (
                                    <Select.Option key={cat._id} value={cat._id}>
                                        {cat.categoria}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                        </div>
                    </div>
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
                    productsList={isLoadingInventory ? [] : finalProductList}
                    loading={isLoadingInventory}
                    onUpdateProducts={() => fetchInventoryPage(true)}
                    sucursalId={sucursalId}
                    setSucursalId={setSucursalId}
                    branches={sellerSucursales}
                    categories={categories}
                    searchText={searchText}
                    setSearchText={setSearchText}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                />
            ) : (
                <ProductTable
                    productsList={finalProductList}
                    groupList={groups || []}
                    onUpdateProducts={() => fetchInventoryPage(true)}
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
            {!isSeller && !selectedSeller && (
                <div className="flex justify-center">
                    <Button
                        onClick={handleLoadMoreInventory}
                        loading={isLoadingInventory}
                        disabled={!hasMoreInventory}
                    >
                        {hasMoreInventory
                            ? `Ver ${SELLERS_PAGE_SIZE} vendedores mas`
                            : `No hay mas vendedores (${inventoryTotal})`}
                    </Button>
                </div>
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
                        await fetchInventoryPage(true);
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
                    onStockDraftChange={setStockListForConfirmModal}
                    onSuccess={(context?: { createdProductIds?: string[] }) => {
                        closeConfirmProduct();
                        setProductsToUpdate({});
                        setStockListForConfirmModal([]);
                        setResetSignal(true);
                        setTimeout(() => setResetSignal(false), 100);

                        const createdProductIds = (context?.createdProductIds || []).filter(Boolean);
                        if (createdProductIds.length > 0) {
                            setQrModalProductIds(createdProductIds);
                            setQrModalAutoGenerate(true);
                            setIsQRBatchModalVisible(true);
                        }
                    }}
                    newVariants={getTempVariants()}
                    newProducts={getTempProducts()}
                    newStock={stockListForConfirmModal}
                    productosConSucursales={productosFull}
                    selectedSeller={sellers.find(s => s._id === selectedSeller)}
                />
            )}
            <InventoryQRModal
                open={isInventoryQRModalVisible}
                onClose={() => setIsInventoryQRModalVisible(false)}
                sellerId={effectiveSellerId || undefined}
                sellerLabel={effectiveSellerLabel}
                sucursalId={effectiveBranchId || undefined}
                sucursalLabel={effectiveBranchLabel}
                onUseDifferences={(draft) => {
                    setIsInventoryQRModalVisible(false);
                    openConfirmWithDraft(draft);
                }}
            />
            <StockQRInfoModal
                open={isStockQRInfoModalVisible}
                onClose={() => setIsStockQRInfoModalVisible(false)}
                sellerId={effectiveSellerId || undefined}
                sellerLabel={effectiveSellerLabel}
                sucursalId={effectiveBranchId || undefined}
                sucursalLabel={effectiveBranchLabel}
            />
            {isMoveModalVisible && (
                <MoveProductsModal
                    visible={isMoveModalVisible}
                    onClose={() => setIsMoveModalVisible(false)}
                    onSuccess={handleMoveSuccess}
                    products={products}



                />
            )}
            <VariantQRBatchModal
                visible={isQRBatchModalVisible}
                onClose={() => {
                    setIsQRBatchModalVisible(false);
                    setQrModalAutoGenerate(false);
                    setQrModalProductIds([]);
                }}
                sellers={sellers}
                selectedSellerId={selectedSeller ? String(selectedSeller) : undefined}
                initialProductIds={qrModalProductIds}
                autoGenerateOnOpen={qrModalAutoGenerate}
            />
        </div>

    );
};

export default StockManagement;


