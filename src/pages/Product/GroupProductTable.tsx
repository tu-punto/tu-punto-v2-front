import { Button, Input, Table, message } from "antd";
import { getProductsInGroupAPI, updateGroupAndProductNamesAPI } from "../../api/group";
import { useEffect, useState } from "react";
import ProductInfoModal from "./ProductInfoModal";
import { InfoCircleOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import useEditable from "../../hooks/useEditableProperty";


const GroupProductTable = ({ group, onAddVariant, refreshProducts }: any) => {
    const columns = [
        {
            title: '',
            dataIndex: 'infoButton',
            key: 'infoButton',
            width: '5%'
        },
        {
            title: 'Producto',
            dataIndex: 'producto',
            key: 'producto',
            width: "20%",
            className: 'text-mobile-sm xl:text-desktop-sm',
            fixed: 'left' as const,
        },
        {
            title: 'Ingreso/Entrada',
            dataIndex: 'ingreso',
            key: 'ingreso',
            render: (_: any, record: any) => (
                <Input
                    type="number"
                    value={''}
                    className="text-mobile-sm xl:text-desktop-sm"
                    // value={ingresoData[record.id_producto] || ''}
                    // onChange={(e) =>
                    //     handleIngresoChange(record.id_producto, parseInt(e.target.value, 10) || 0)
                    // }
                />
            ),
            width: "20%",
            className: 'text-mobile-sm xl:text-desktop-sm'
        },
        {
            title: 'Stock actual',
            dataIndex: 'stockActual',
            key: 'stockActual',
            width: "20%",
            className: 'text-mobile-sm xl:text-desktop-sm'
        },
        {
            title: 'Categoría',
            dataIndex: 'categoria',
            key: 'categoria',
            width: "20%",
            className: 'text-mobile-sm xl:text-desktop-sm'
        },
        {
            title: 'Precio de venta',
            dataIndex: "precio",
            key: "precio",
            width: "20%",
            className: 'text-mobile-sm xl:text-desktop-sm'
        }
    ];


    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const {
        isEditing,
        value: groupName,
        editedValue: newGroupName,
        startEditing,
        setEditedValue,
        cancelEditing,
        saveEditing,
    } = useEditable(group.name);

    const showModal = (product: any) => {
        setSelectedProduct(product)
        setIsModalVisible(true)
    }
    const closeModal = () => {
        setIsModalVisible(false)
        setSelectedProduct(null)
        refreshProducts()
    }

    const [products, setProducts] = useState<any>([])

    useEffect(() => {
        const fetchProductInCategory = async () => {
            const productsRes = await getProductsInGroupAPI(group.id);
            const parseProducts = await Promise.all(productsRes.map(async (product: any) => {
                // const category = await getProductCategoryAPI(product.id_producto)
                // TODO: probar 
                return ({
                    infoButton: (
                        <Button type="primary" onClick={() => showModal(product)}>
                            <InfoCircleOutlined />
                        </Button>
                    ),

                    producto: product.nombre_producto,
                    stockActual: product.producto_sucursal.reduce((acc: number, prodSuc: any) => acc + prodSuc.cantidad_por_sucursal, 0) || 0,
                    categoria: product.categoria.categoria,
                    precio: product.precio
                })
            }))
            setProducts(parseProducts)
        }
        fetchProductInCategory()
    }, [])


    const saveGroupName = async () => {
        saveEditing(newGroupName)
        const res = await updateGroupAndProductNamesAPI({ name: newGroupName }, group.id)
        if (res.success) {
            message.success('Nombre del grupo actualizado con éxito')
            group.name = newGroupName
            refreshProducts(group.id)
        } else {
            message.error('Error al actualizar el nombre del grupo')
        }

    }

    return (
        <div style={{ margin: '1rem' }}>
            <Table
                columns={columns}
                dataSource={products}
                scroll={{ x: "max-content" }}
                pagination={{pageSize: 5 }}
                title={() => (
                    <div className="flex justify-between items-center">
                        {/* <div className="flex item ">
                            <h2 className="font-semibold">{group.name}</h2>
                            <Button className="mx-2" type="default" onClick={editGroupName}><EditOutlined /></Button>
                        </div> */}
                        <div className="flex items-center">
                            {isEditing ? (
                                <div className="flex items-center">
                                    <Input
                                        value={newGroupName}
                                        onChange={(e) => setEditedValue(e.target.value)}
                                        style={{ width: 200 }}
                                        className="text-mobile-sm xl:text-desktop-sm"
                                    />
                                    <Button
                                        type="primary"
                                        className="mx-2"
                                        icon={<CheckOutlined />}
                                        onClick={saveGroupName}
                                    />
                                    <Button
                                        icon={<CloseOutlined />}
                                        onClick={cancelEditing}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <h2 className="font-semibold text-mobile-3xl xl:text-desktop-3xl">{groupName}</h2>
                                    <Button
                                        className="mx-2"
                                        type="default"
                                        onClick={startEditing}
                                    >
                                        <EditOutlined />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Button type="primary" onClick={onAddVariant} className="text-mobile-sm xl:text-desktop-sm">Agregar Variante</Button>
                    </div>
                )}
            />
            {selectedProduct && (
                <ProductInfoModal
                    visible={isModalVisible}
                    onClose={closeModal}
                    product={selectedProduct}
                />
            )}
        </div>


    )

}

export default GroupProductTable