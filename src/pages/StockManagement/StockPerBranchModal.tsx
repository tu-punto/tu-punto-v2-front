import { Modal, Table } from 'antd';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';

const StockPerBranchModal = ({
                                 visible,
                                 onClose,
                                 variantName,
                                 producto,
                             }) => {
    const [dataSource, setDataSource] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && variantName && producto) fetchData();
    }, [visible, variantName, producto]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const branches = await getSucursalsAPI();
            const data = branches
                .map(branch => {
                    const id = branch._id?.$oid || branch._id;
                    const sucursal = producto.sucursales?.find(
                        s => (s.id_sucursal?.$oid || s.id_sucursal) === id
                    );

                    const match = sucursal?.combinaciones?.find(c =>
                        Object.values(c.variantes || {}).join(" / ").toLowerCase() === variantName.toLowerCase()
                    );

                    if (!match) return null;

                    return {
                        key: id,
                        nombre: branch.nombre,
                        stock: match.stock,
                    };
                })
                .filter(Boolean);
            setDataSource(data);
        } catch (err) {
            console.error("Error obteniendo stock por sucursal:", err);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Sucursal', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Stock', dataIndex: 'stock', key: 'stock' },
    ];

    return (
        <Modal
            title={`Stock por Sucursal - Variante: ${variantName}`}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Table columns={columns} dataSource={dataSource} loading={loading} pagination={false} />
        </Modal>
    );
};

export default StockPerBranchModal;
