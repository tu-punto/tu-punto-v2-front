import { Modal, Table } from 'antd';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal'; // Ajusta el path si es diferente

const StockPerBranchModal = ({ visible, onClose, productoSucursal }: { visible: boolean, onClose: () => void, productoSucursal: any[] }) => {

    const [branches, setBranches] = useState<any[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

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
        } catch (error) {
            console.error('Error al obtener sucursales:', error);
        } finally {
            setLoadingBranches(false);
        }
    };

    const columns = [
        { title: 'Sucursal', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Cantidad', dataIndex: 'cantidad_por_sucursal', key: 'cantidad_por_sucursal' }
    ];

    // Armamos la data combinada:
    const dataSource = branches.map((branch) => {
        const sucursalEncontrada = productoSucursal.find(ps => ps.id_sucursal === (branch._id.$oid || branch._id));

        return {
            key: branch._id.$oid || branch._id,
            nombre: branch.nombre,
            cantidad_por_sucursal: sucursalEncontrada ? sucursalEncontrada.cantidad_por_sucursal : 0
        };
    });

    return (
        <Modal
            title="Stock por Sucursal"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
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
