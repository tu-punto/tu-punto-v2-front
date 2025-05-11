import { Modal, Table } from 'antd';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';

const StockPerBranchModal = ({
                                 visible,
                                 onClose,
                                 variantName,
                                 producto,
                             }: {
    visible: boolean;
    onClose: () => void;
    variantName: string;
    producto: any;
}) => {
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && variantName && producto) {
            fetchData();
        }
    }, [visible, variantName, producto]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getSucursalsAPI();
            const combinedData = res.map((branch: any) => {
                const sucursalId = branch._id.$oid || branch._id;

                const foundSucursal = producto.sucursales?.find(
                    (s: any) => (s.id_sucursal.$oid || s.id_sucursal) === sucursalId
                );

                const foundVariante = foundSucursal?.variantes?.find(
                    (v: any) => v.nombre_variante === variantName
                );

                return {
                    key: sucursalId,
                    nombre: branch.nombre,
                    stock: foundVariante ? foundVariante.stock : 0
                };
            });

            setDataSource(combinedData);
        } catch (error) {
            console.error('Error al obtener datos del stock por sucursal:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Sucursal', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Stock', dataIndex: 'stock', key: 'stock' }
    ];

    return (
        <Modal
            title={`Stock por Sucursal - Variante: ${variantName}`}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={false}
                size="small"
            />
        </Modal>
    );
};

export default StockPerBranchModal;
