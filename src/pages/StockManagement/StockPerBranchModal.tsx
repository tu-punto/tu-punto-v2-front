import { Modal, Table, Button, InputNumber, Space, message } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';
import { updateProductBranchStockAPI, addProductStockAPI } from '../../api/product'; // Importamos tu nueva API

const StockPerBranchModal = ({ visible, onClose, productoSucursal }: { visible: boolean, onClose: () => void, productoSucursal: any[] }) => {

    const [branches, setBranches] = useState<any[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dataSource, setDataSource] = useState<any[]>([]);

    useEffect(() => {
        if (visible) {
            fetchBranches();
        }
    }, [visible]);

    const fetchBranches = async () => {
        setLoadingBranches(true);
        try {
            const res = await getSucursalsAPI();
            setBranches(res);
            // Construimos la data cuando abrimos el modal
            const combinedData = res.map((branch: any) => {
                const found = productoSucursal.find(ps => ps.id_sucursal === (branch._id.$oid || branch._id));
                return {
                    key: branch._id.$oid || branch._id,
                    nombre: branch.nombre,
                    cantidad_por_sucursal: found ? found.cantidad_por_sucursal : 0,
                    id_producto_sucursal: found ? (found._id.$oid || found._id) : null
                };
            });
            setDataSource(combinedData);
        } catch (error) {
            console.error('Error al obtener sucursales:', error);
        } finally {
            setLoadingBranches(false);
        }
    };

    const handleSaveChanges = async () => {
        try {
            const updates = dataSource.filter(row => row.id_producto_sucursal !== null);
            const creations = dataSource.filter(row => row.id_producto_sucursal === null && row.cantidad_por_sucursal > 0);

            // Primero actualizamos los que ya existen
            for (const item of updates) {
                await updateProductBranchStockAPI(item.id_producto_sucursal, item.cantidad_por_sucursal);
            }

            // Luego creamos los nuevos registros de productos_sucursal
            for (const item of creations) {
                await addProductStockAPI({
                    branch: item.key, // ID de sucursal
                    products: [
                        {
                            id_producto: productoSucursal[0].id_producto, // sacado de productoSucursal
                            cantidad_por_sucursal: item.cantidad_por_sucursal,
                            numero_caja: 0 // Siempre iniciar en 0
                        }
                    ]
                });
            }

            message.success('Stock actualizado exitosamente');
            setEditing(false);
            onClose();
        } catch (error) {
            console.error('Error al actualizar o registrar stock:', error);
            message.error('Error actualizando o registrando stock');
        }
    };


    const handleChangeCantidad = (value: number, key: string) => {
        setDataSource(prev =>
            prev.map(item =>
                item.key === key ? { ...item, cantidad_por_sucursal: value } : item
            )
        );
    };

    const columns = [
        { title: 'Sucursal', dataIndex: 'nombre', key: 'nombre' },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad_por_sucursal',
            key: 'cantidad_por_sucursal',
            render: (text: any, record: any) =>
                editing ? (
                    <InputNumber
                        min={0}
                        value={record.cantidad_por_sucursal}
                        onChange={(value) => handleChangeCantidad(value || 0, record.key)}
                    />
                ) : (
                    record.cantidad_por_sucursal
                )
        }
    ];

    return (
        <Modal
            title="Stock por Sucursal"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Space style={{ marginBottom: 16 }}>
                {!editing ? (
                    <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                        Editar
                    </Button>
                ) : (
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveChanges}>
                        Guardar Cambios
                    </Button>
                )}
            </Space>

            <Table
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                loading={loadingBranches}
                size="small"
            />
        </Modal>
    );
};

export default StockPerBranchModal;
