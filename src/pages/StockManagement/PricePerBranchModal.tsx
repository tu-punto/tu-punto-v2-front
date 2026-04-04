import { Alert, Button, Card, Divider, InputNumber, List, Modal, Space, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';
import { updateProductPriceAPI } from '../../api/product';

const { Text, Title } = Typography;

const normalizeVariantMap = (variantes: Record<string, string> = {}) =>
    Object.fromEntries(
        Object.entries(variantes || {}).map(([key, value]) => [
            String(key).trim(),
            String(value ?? '').trim()
        ])
    );

const areVariantsEqual = (
    left: Record<string, string> = {},
    right: Record<string, string> = {}
) => {
    const normalizedLeft = normalizeVariantMap(left);
    const normalizedRight = normalizeVariantMap(right);
    const leftKeys = Object.keys(normalizedLeft);
    const rightKeys = Object.keys(normalizedRight);

    if (leftKeys.length !== rightKeys.length) return false;

    return leftKeys.every(
        (key) =>
            String(normalizedLeft[key] || '').toLowerCase() ===
            String(normalizedRight[key] || '').toLowerCase()
    );
};

const findMatchingCombination = (combinaciones: any[] = [], variantData: any) =>
    combinaciones.find((item) => {
        if (variantData?.variantKey && item?.variantKey) {
            return item.variantKey === variantData.variantKey;
        }

        return areVariantsEqual(item?.variantes || {}, variantData?.variantes || {});
    });

const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return `Bs ${Number(value).toFixed(2)}`;
};

const PricePerBranchModal = ({
    visible,
    onClose,
    variantData,
    producto,
    onRefresh
}: {
    visible: boolean;
    onClose: () => void;
    variantData: any;
    producto: any;
    onRefresh?: () => Promise<void> | void;
}) => {
    const [branchRows, setBranchRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [price, setPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!visible) {
            setBranchRows([]);
            setPrice(null);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || !variantData || !producto) return;

        const fetchData = async () => {
            setLoading(true);

            try {
                const sucursales = await getSucursalsAPI();
                const combinedData = sucursales.map((branch: any) => {
                    const sucursalId = branch._id?.$oid || branch._id;
                    const sucursal = producto.sucursales?.find(
                        (item: any) => String(item.id_sucursal?.$oid || item.id_sucursal) === String(sucursalId)
                    );
                    const combinacion = findMatchingCombination(sucursal?.combinaciones || [], variantData);

                    return {
                        key: String(sucursalId),
                        nombre: branch.nombre,
                        disponible: Boolean(combinacion),
                        precio: combinacion ? Number(combinacion.precio || 0) : null
                    };
                });

                const firstAvailablePrice = combinedData.find((item) => item.disponible)?.precio;
                const basePrice = Number(
                    variantData?.precio ?? firstAvailablePrice ?? 0
                );

                setBranchRows(combinedData);
                setPrice(Number.isFinite(basePrice) ? basePrice : null);
            } catch (error) {
                console.error("Error al obtener datos de precio unificado:", error);
                message.error("No se pudo cargar la informacion de precios");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [visible, variantData, producto]);

    const availableRows = useMemo(
        () => branchRows.filter((item) => item.disponible),
        [branchRows]
    );

    const distinctPrices = useMemo(() => {
        const values = availableRows.map((item) => Number(item.precio || 0).toFixed(2));
        return Array.from(new Set(values));
    }, [availableRows]);

    const hasInconsistentPrices = distinctPrices.length > 1;
    const missingBranches = branchRows.length - availableRows.length;

    const handleSave = async () => {
        if (price === null || price <= 0) {
            message.warning('Ingrese un precio valido mayor a 0');
            return;
        }

        try {
            setSaving(true);

            const res = await updateProductPriceAPI({
                productId: producto._id?.$oid || producto._id,
                variantKey: variantData?.variantKey,
                variantes: normalizeVariantMap(variantData?.variantes || {}),
                precio: Number(price)
            });

            if (!res?.success) {
                message.error(res?.message || 'Error al actualizar el precio');
                return;
            }

            message.success('Precio actualizado en todas las sucursales');
            await onRefresh?.();
            onClose();
        } catch (error) {
            console.error('Error al guardar precio unificado:', error);
            message.error('Ocurrio un error al guardar el precio');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Precio unificado de variante"
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button key="save" type="primary" loading={saving} onClick={handleSave}>
                    Guardar precio
                </Button>
            ]}
            width={720}
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                    <Title level={5} style={{ marginBottom: 4 }}>
                        {producto?.nombre_producto || 'Producto'}
                    </Title>
                    <Text type="secondary">
                        {variantData?.label || 'Variante sin nombre'}
                    </Text>
                </div>

                {hasInconsistentPrices && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Se detectaron precios distintos entre sucursales"
                        description="Al guardar, la variante quedara con un solo precio unificado."
                    />
                )}

                <Card
                    bordered={false}
                    style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 14,
                        background: 'linear-gradient(180deg, #fcfcfc 0%, #f7f7f7 100%)'
                    }}
                >
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        <Space wrap size={[8, 8]}>
                            <Tag color="blue">{availableRows.length} sucursales con la variante</Tag>
                            <Tag color={missingBranches > 0 ? 'gold' : 'green'}>
                                {missingBranches > 0
                                    ? `${missingBranches} sucursales sin esa combinacion`
                                    : 'Sin diferencias de presencia'}
                            </Tag>
                        </Space>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                                <Text type="secondary">Nuevo precio</Text>
                                <InputNumber
                                    min={0}
                                    value={price}
                                    onChange={(value) => setPrice(value ?? null)}
                                    style={{ width: '100%', marginTop: 6 }}
                                    placeholder="Ej. 79.90"
                                />
                            </div>

                            <Button
                                onClick={() =>
                                    setPrice(
                                        Number(
                                            availableRows[0]?.precio ??
                                            variantData?.precio ??
                                            0
                                        )
                                    )
                                }
                                disabled={!availableRows.length}
                            >
                                Usar precio actual
                            </Button>
                        </div>

                    </Space>
                </Card>

                <Divider style={{ margin: 0 }} />

                <div>
                    <Text strong>Referencia por sucursal</Text>
                    <List
                        loading={loading}
                        dataSource={branchRows}
                        locale={{ emptyText: 'No se encontraron sucursales para esta variante.' }}
                        style={{ marginTop: 12 }}
                        renderItem={(item) => (
                            <List.Item>
                                <div
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 12,
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <Space wrap size={[8, 8]}>
                                        <Text strong>{item.nombre}</Text>
                                        <Tag color={item.disponible ? 'green' : 'default'}>
                                            {item.disponible ? 'Disponible' : 'Sin variante'}
                                        </Tag>
                                    </Space>

                                    <Space wrap size={[8, 8]}>
                                        <Text type="secondary">Actual: {formatPrice(item.precio)}</Text>
                                        {item.disponible && price !== null && (
                                            <Tag color="blue">Quedara: {formatPrice(price)}</Tag>
                                        )}
                                    </Space>
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            </Space>
        </Modal>
    );
};

export default PricePerBranchModal;
