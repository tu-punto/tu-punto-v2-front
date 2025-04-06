import { useState } from "react";
import Button from "antd/es/button";
import ProductFormModal from "./ProductFormModal";
import useGroup from "../../hooks/useGroup";
import GroupProductTable from "./GroupProductTable";
import AddVariantModal from "./AddVariantModal";
import { addProductFeaturesAPI, registerVariantAPI } from "../../api/product";

const Product = () => {
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [isVariantModalVisible, setIsVariantModalVisible] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0)
    const [selectedGroup, setSelectedGroup] = useState(null);
    const { groups, fetchGroups, setGroup } = useGroup()
    const [refreshKeys, setRefreshKeys] = useState({});
  

    const showModal = () => {
        setIsModalVisible(true)
    }

    const handleCancel = () => {
        setIsModalVisible(false)
    }

    const handleSuccess = () => {
        fetchGroups()
        setIsModalVisible(false)
        setRefreshKey(prevKey => prevKey + 1)
    }

    const showVariantModal = (group: any) => {
        setSelectedGroup(group);
        setIsVariantModalVisible(true);
    };

    const handleVariantCancel = () => {
        setIsVariantModalVisible(false);
        setSelectedGroup(null);
    };

    const handleVariantAdd = async (newVariant) => {

        const {product,  featuresFilter:features} = newVariant
        const stock = {
            cantidad_por_sucursal: product.stock,
            //TODO Add Sucursal Field in the form
            id_sucursal: 3
        }
        const {newProduct} = await registerVariantAPI({product,stock})
        await addProductFeaturesAPI({productId: newProduct.id_producto, features})

        
        // Update the refresh key for the specific group
        setRefreshKeys((prevKeys) => ({
            ...prevKeys,
            [selectedGroup.id]: (prevKeys[selectedGroup.id] || 0) + 1,
        }));
    

        handleVariantCancel();
    };

    const refreshProducts = (groupId) => {
        setRefreshKeys((prevKeys) => ({
            ...prevKeys,
            [groupId]: (prevKeys[groupId] || 0) + 1,
        }));
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold">Productos</h1>
                <Button onClick={showModal} type='primary' className="text-mobile-sm xl:text-desktop-sm">Agregar Producto</Button>
            </div>
            {
               groups.map(group => 
                    <GroupProductTable 
                        key={`${group.id}-${refreshKeys[group.id] || 0}`} // Unique key to force re-render for the specific group
                        group={group}
                        onAddVariant={() => showVariantModal(group)} 
                        refreshProducts = {() => refreshProducts(group.id)}
                    />
                )
            }
            <ProductFormModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
            />
            {selectedGroup && (
                <AddVariantModal
                    visible={isVariantModalVisible}
                    onCancel={handleVariantCancel}
                    onAdd={handleVariantAdd}
                    group={selectedGroup}
                />
            )}
        </div>
    );
};

export default Product;
