import React, { useContext, useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import SellerList from './SellerList';
import ProductTable from './ProductTable';
import MoveProductsModal from './MoveProductsModal';
import { addProductFeaturesAPI, getProductsAPI, registerVariantAPI } from '../../api/product';
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

const StockManagement = () => {
    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';

    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
    const [isProductFormVisible, setProductFormVisible] = useState<boolean>(false);
    const [isVariantModalVisible, setIsVariantModalVisible] = useState<boolean>(false);
    const [prevKey, setPrevKey] = useState(0);
    const [criteriaFilter, setCriteriaFilter] = useState(0);
    const [criteriaGroup, setCriteriaGroup] = useState(0);

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

    const fetchData = async () => {
        try {
            const sellersResponse = await getSellersAPI();
            const categoriesResponse = await getCategoriesAPI();
            const groupsResponse = await getGroupsAPI();
            const productsResponse = await getProductsAPI();

            //console.log("Sellers", sellersResponse);
            //console.log("Categories", categoriesResponse);
            //console.log("Groups", groupsResponse);
            //console.log("Products", productsResponse);

            setSellers(sellersResponse);
            setCategories(categoriesResponse);
            setGroups(groupsResponse);
            setProducts(productsResponse);
            setFilteredProducts(productsResponse);
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            // Podés mostrar una notificación, etc.
        }
    };


    useEffect(() => {
        fetchData();
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


    const showVariantModal = async (product: any) => {
        const group = await getGroupByIdAPI(product.groupId);
        group.product = product;
        setSelectedGroup(group);
        setIsVariantModalVisible(true);
    };

    const closeConfirmProduct = async () => {
        const productsResponse = await getProductsAPI();
        setProducts(productsResponse);
        setFilteredProducts(productsResponse);
        setNewVariants([]);
        setProductsToUpdate({});
        setNewProducts([]);
        setStock([]);
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
    };


    const handleChangeFilter = (index: number) => {
        setCriteriaFilter(index);
    };

    const handleChangeGroup = (index: number) => {
        setCriteriaGroup(index);
    };

    const saveNewProducts = async (productData, combinations, selectedFeatures, features) => {
        await createProductsFromGroup(productData, combinations, selectedFeatures, features);
        setProductFormVisible(false);
        setNewProducts([...newProducts, {
            productData,
            combinations,
            selectedFeatures,
            features
        }]);
        setPrevKey(key => key + 1);
    };

    const controlSpan = isSeller ? { xs: 24, sm: 12, lg: 8 } : { xs: 24, sm: 12, lg: 6 };

    const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

    const handleMoveSuccess = () => {
        fetchData();
        setIsMoveModalVisible(false);
    };

    //console.log("CRITERIA GROUP:", criteriaGroup);
    //console.log("GROUP ENVIADO A PRODUCTTABLE:", options[criteriaGroup]?.group);
    //console.log("FUNCIÓN DE AGRUPACIÓN:", options[criteriaGroup]?.groupFunction);
    return (

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="block xl:flex justify-center">
                <h2 className='text-mobile-3xl xl:text-mobile-3xl mr-4'>Lista de</h2>
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
            </div>
            <Row gutter={[16, 16]} justify="center" align="middle">
                <Col xs={24} md={8} style={{ marginBottom: "16px" }}>
                    <SellerList
                        filterSelected={criteriaFilter}
                        onSelectSeller={handleSelectSeller}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} justify="center" align="middle" style={{ marginBottom: "16px" }}>


                {!isSeller && (
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
                        <Col xs={24} sm={12} lg={6}>
                            <Button
                                onClick={() => setIsMoveModalVisible(true)}
                                type="default"
                                className='text-mobile-base xl:text-mobile-base'
                            >
                                Mover Productos
                            </Button>
                        </Col>
                    </>
                )}

                <Col {...controlSpan}>
                    <Button
                        onClick={() => {
                            const newStock = [];
                            for (const productId in productsToUpdate) {
                                const product = products.find(
                                    (product) => product.id_producto == productId
                                );

                                if (product.producto_sucursal[0]) {
                                    product.entrance = productsToUpdate[productId];
                                }

                                newStock.push({
                                    product,
                                    newStock: {
                                        productId,
                                        sucursalId: 3,
                                        stock: productsToUpdate[productId],
                                    },
                                });
                            }
                            setStock(newStock);
                            setIsConfirmModalVisible(true);
                        }}
                        className='text-mobile-base xl:text-mobile-base'
                    >
                        Actualizar Stock
                    </Button>
                </Col>
            </Row>

            <ProductTable
                groupList={options[criteriaFilter]?.group || []}
                groupCriteria={(group) => {
                    const fn = options[criteriaFilter]?.groupFunction;
                    if (typeof fn !== 'function' || !Array.isArray(filteredProducts)) return [];
                    return fn(group, filteredProducts);
                }}
                productsList={
                    isSeller
                        ? products.filter((product) => product._id === user._id)
                        : filteredProducts
                }
                handleUpdate={(ingresoData: { [key: number]: number }) => {
                    setProductsToUpdate(ingresoData);
                }}
                onUpdateProducts={fetchData} // ✅ PASA ESTA FUNCIÓN AL HIJO
            />
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
                    onSuccess={closeConfirmProduct}
                    newVariants={newVariants}
                    newProducts={newProducts}
                    newStock={stock}
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