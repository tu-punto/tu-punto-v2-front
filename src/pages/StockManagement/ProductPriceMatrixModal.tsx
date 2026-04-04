import { Button, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { updateProductPriceAPI } from '../../api/product';

const getVariantLabel = (variantes: Record<string, string> = {}) =>
    Object.values(variantes || {})
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' / ');

const ProductPriceMatrixModal = ({
    visible,
    onClose,
    producto,
    onRefresh
}: {
    visible: boolean;
    onClose: () => void;
    producto: any;
    onRefresh?: () => Promise<void> | void;
}) => {
    const [rows, setRows] = useState<any[]>([]);
    const [bulkPrice, setBulkPrice] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) {
            setRows([]);
            setBulkPrice(null);
            return;
        }

        const sucursalId = localStorage.getItem('sucursalId') || '';
        const currentBranch =
            producto?.sucursales?.find(
                (branch: any) =>
                    String(branch.id_sucursal?.$oid || branch.id_sucursal) === String(sucursalId)
            ) || producto?.sucursales?.find((branch: any) => (branch?.combinaciones || []).length > 0);

        const nextRows = (currentBranch?.combinaciones || []).map((combination: any, index: number) => ({
            key: combination.variantKey || `${getVariantLabel(combination.variantes)}-${index}`,
            variantKey: combination.variantKey,
            variantes: combination.variantes || {},
            label: getVariantLabel(combination.variantes || {}) || `Variante ${index + 1}`,
            precio: Number(combination.precio || 0)
        }));

        setRows(nextRows);
        setBulkPrice(null);
    }, [visible, producto]);

    const hasRows = rows.length > 0;

    const applyBulkPrice = () => {
        if (bulkPrice === null || bulkPrice < 0) return;

        setRows((currentRows) =>
            currentRows.map((row) => ({
                ...row,
                precio: bulkPrice
            }))
        );
        setBulkPrice(null);
    };

    const hasInvalidPrice = useMemo(
        () => rows.some((row) => row.precio === null || row.precio === undefined || Number(row.precio) <= 0),
        [rows]
    );

    const handleSave = async () => {
        if (!rows.length) {
            message.warning('No hay variantes para actualizar');
            return;
        }

        if (hasInvalidPrice) {
            message.warning('Todos los precios deben ser mayores a 0');
            return;
        }

        try {
            setSaving(true);

            const res = await updateProductPriceAPI(
                rows.map((row) => ({
                    productId: producto._id?.$oid || producto._id,
                    variantKey: row.variantKey,
                    variantes: row.variantes,
                    precio: Number(row.precio)
                }))
            );

            if (!res?.success) {
                message.error(res?.message || 'No se pudieron actualizar los precios');
                return;
            }

            message.success('Precios actualizados');
            await onRefresh?.();
            onClose();
        } catch (error) {
            console.error('Error al guardar matriz de precios:', error);
            message.error('Ocurrio un error al guardar los precios');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Precios de variantes"
            open={visible}
            onCancel={onClose}
            width={760}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button key="save" type="primary" loading={saving} onClick={handleSave}>
                    Guardar precios
                </Button>
            ]}
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                    <Typography.Title level={5} style={{ marginBottom: 4 }}>
                        {producto?.nombre_producto || 'Producto'}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        Edita los precios por variante o aplica un mismo valor a todas.
                    </Typography.Text>
                </div>

                {hasRows && (
                    <div
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            border: '1px solid #e8e8e8',
                            background: 'linear-gradient(180deg, #fcfcfc 0%, #f7f7f7 100%)'
                        }}
                    >
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <div>
                                <Typography.Text strong>Precio masivo</Typography.Text>
                                <br />
                                <Typography.Text type="secondary">
                                    Aplica un mismo precio a todas las variantes visibles.
                                </Typography.Text>
                            </div>

                            <Space wrap size={[8, 8]}>
                                <InputNumber
                                    min={0}
                                    value={bulkPrice}
                                    onChange={(value) => setBulkPrice(value ?? null)}
                                    placeholder="Precio para todas"
                                />
                                <Button type="primary" onClick={applyBulkPrice} disabled={bulkPrice === null}>
                                    Aplicar a todas
                                </Button>
                            </Space>
                        </Space>
                    </div>
                )}

                <Table
                    rowKey="key"
                    pagination={false}
                    dataSource={rows}
                    locale={{ emptyText: 'Este producto no tiene variantes para editar.' }}
                    columns={[
                        {
                            title: 'Variante',
                            dataIndex: 'label',
                            key: 'label'
                        },
                        {
                            title: 'Precio',
                            dataIndex: 'precio',
                            key: 'precio',
                            render: (value: number, record: any) => (
                                <InputNumber
                                    min={0}
                                    value={value}
                                    onChange={(nextValue) =>
                                        setRows((currentRows) =>
                                            currentRows.map((row) =>
                                                row.key === record.key
                                                    ? { ...row, precio: nextValue ?? 0 }
                                                    : row
                                            )
                                        )
                                    }
                                />
                            )
                        }
                    ]}
                />
            </Space>
        </Modal>
    );
};

export default ProductPriceMatrixModal;
