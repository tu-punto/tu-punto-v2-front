import React from 'react';
import { Modal, Select, Button, Table, message } from 'antd';
// import { getSellersAPI } from '../../api/seller';
// import { moveProductsToBranchAPI } from '../../api/product';

const { Option } = Select;

interface MoveProductsModalProps {
    visible: boolean;
    onClose: () => void;
    products: any[];
    onSuccess: () => void;
}

const MoveProductsModal: React.FC<MoveProductsModalProps> = ({ visible, onClose, products, onSuccess }) => {
    // const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    // const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    // const [branches, setBranches] = useState<any[]>([]);
    // const [loading, setLoading] = useState<boolean>(false);

    // useEffect(() => {
    //     const fetchBranches = async () => {
    //         try {
    //             const response = await getSellersAPI();
    //             setBranches(response);
    //         } catch (error) {
    //             message.error('Error al obtener las sucursales.');
    //         }
    //     };

    //     if (visible) {
    //         fetchBranches();
    //         setSelectedProductIds([]);
    //         setSelectedBranchId(null);
    //     }
    // }, [visible]);

    /*
    const handleMove = async () => {
        if (!selectedBranchId) {
            message.warning('Por favor, selecciona una sucursal de destino.');
            return;
        }
        if (selectedProductIds.length === 0) {
            message.warning('Por favor, selecciona al menos un producto.');
            return;
        }

        setLoading(true);
        try {
            await moveProductsToBranchAPI(selectedProductIds, selectedBranchId);
            message.success('Productos movidos exitosamente.');
            onSuccess();
            onClose();
        } catch (error) {
            message.error('Error al mover los productos.');
        } finally {
            setLoading(false);
        }
    };
    */

    // Hardcoded example data
    const selectedProductIds: number[] = [1];
    const selectedBranchId: number | null = 1;
    const branches = [
        { _id: 1, nombre: 'Sucursal Central' },
        { _id: 2, nombre: 'Sucursal Norte' }
    ];
    const loading = false;

    const columns = [
        {
            title: 'Nombre del Producto',
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
        },
        {
            title: 'Categoría',
            dataIndex: 'nombre_categoria',
            key: 'nombre_categoria',
        },
        {
            title: 'Vendedor',
            dataIndex: 'nombre_vendedor',
            key: 'nombre_vendedor',
        },
    ];

    const rowSelection = {
        selectedRowKeys: selectedProductIds,
        onChange: (selectedRowKeys: React.Key[]) => {
            message.info('Selección estática. No se actualiza el estado.');
        },
    };

    return (
        <Modal
            visible={visible}
            title="Mover Productos a Otra Sucursal"
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button
                    key="move"
                    type="primary"
                    loading={loading}
                    onClick={() => message.info('Función de mover productos aún no implementada.')}
                >
                    Mover
                </Button>,
            ]}
            width={800}
        >
            <div style={{ marginBottom: 16 }}>
                <span style={{ marginRight: 8 }}>Sucursal de destino:</span>
                <Select
                    style={{ width: 300 }}
                    placeholder="Selecciona una sucursal"
                    value={selectedBranchId}
                    onChange={(value) => message.info('Selección estática. No se actualiza el estado.')}
                >
                    {branches.map((branch) => (
                        <Option key={branch._id} value={branch._id}>
                            {branch.nombre}
                        </Option>
                    ))}
                </Select>
            </div>
            <Table
                rowKey="id_producto"
                rowSelection={rowSelection}
                columns={columns}
                dataSource={products}
                pagination={{ pageSize: 5 }}
            />
        </Modal>
    );
};

export default MoveProductsModal;
