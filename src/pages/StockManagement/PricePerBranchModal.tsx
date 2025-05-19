import { Modal, Table, InputNumber, Button, message } from 'antd';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';
import { updateProductPriceAPI } from '../../api/product';
import { Modal as AntModal } from 'antd';

const PricePerBranchModal = ({
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
    const [saving, setSaving] = useState(false);

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
                    precio: foundVariante?.precio ?? 0,
                    disponible: !!foundVariante
                };
            });

            setDataSource(combinedData);
        } catch (error) {
            console.error('Error al obtener datos de precios por sucursal:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (value: number, key: string) => {
        setDataSource((prev) =>
            prev.map((item) => (item.key === key ? { ...item, precio: value } : item))
        );
    };

    const handleSave = async () => {
        // Solo validamos precios donde el producto está disponible
        const hasInvalidPrice = dataSource.some(
            item => item.disponible && (item.precio === null || item.precio === undefined || item.precio < 0)
        );

        if (hasInvalidPrice) {
            message.warning('Hay precios inválidos en sucursales donde el producto está presente.');
            return;
        }

        AntModal.confirm({
            title: '¿Estás seguro de guardar estos precios?',
            content: 'Solo se actualizarán los precios en sucursales donde el producto ya está registrado.',
            okText: 'Sí, guardar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setSaving(true);
                try {
                    const priceUpdates = dataSource
                        .filter(item => item.disponible) // ✅ Solo se envían los válidos
                        .map((item) => ({
                            productId: producto._id?.$oid || producto._id,
                            sucursalId: item.key,
                            varianteNombre: variantName,
                            precio: item.precio,
                        }));

                    const res = await updateProductPriceAPI(priceUpdates);

                    if (res.success) {
                        message.success('Precios actualizados correctamente');
                        onClose();
                    } else {
                        message.error(res.message || 'Error al actualizar precios');
                    }
                } catch (error) {
                    console.error('Error al guardar precios:', error);
                    message.error('Ocurrió un error al guardar');
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    const columns = [
        { title: 'Sucursal', dataIndex: 'nombre', key: 'nombre' },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            render: (value: number, record: any) => (
                <InputNumber
                    min={0}
                    value={value}
                    onChange={(val) => handlePriceChange(val as number, record.key)}
                />
            ),
        },
    ];

    return (
        <Modal
            title={`Precios por Sucursal - Variante: ${variantName}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button key="save" type="primary" loading={saving} onClick={handleSave}>
                    Guardar
                </Button>,
            ]}
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

export default PricePerBranchModal;
