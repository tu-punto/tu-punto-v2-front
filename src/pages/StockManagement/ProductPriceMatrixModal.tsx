import { Button, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { updateProductPriceAPI } from '../../api/product';

const PRICE_MATRIX_PAGE_SIZE = 25;

const getVariantLabel = (variantes: Record<string, string> = {}) =>
    Object.values(variantes || {})
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' / ');

const getBranchId = (branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal?.$oid || branch?.id_sucursal || '');

const normalizeVariants = (variantes: Record<string, any> = {}) =>
    Object.entries(variantes || {})
        .filter(([, value]) => String(value || '').trim())
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value || '').trim() }), {});

const buildCombinationKey = (productId: string, combination: any, index: number) => {
    const variantKey = String(combination?.variantKey || '').trim();
    const normalizedVariants = normalizeVariants(combination?.variantes || {});
    const variantHash = Object.keys(normalizedVariants).length ? JSON.stringify(normalizedVariants) : '';

    return `${productId}-${variantKey || 'sin-variant-key'}-${variantHash || index}`;
};

const buildVariantIdentity = (combination: any) => {
    const normalizedVariants = normalizeVariants(combination?.variantes || combination?.variantes_obj || {});
    const variantHash = Object.keys(normalizedVariants).length ? JSON.stringify(normalizedVariants) : '';
    return variantHash || String(combination?.variant || combination?.label || combination?.variantKey || '').trim().toLowerCase();
};

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
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [pageSize, setPageSize] = useState(PRICE_MATRIX_PAGE_SIZE);

    useEffect(() => {
        if (!visible) {
            setRows([]);
            setBulkPrice(null);
            setSearchTerm('');
            setPageSize(PRICE_MATRIX_PAGE_SIZE);
            return;
        }

        const sucursalId = localStorage.getItem('sucursalId') || '';
        const productId = String(producto?._id?.$oid || producto?._id || '');
        const branches = Array.isArray(producto?.sucursales) ? producto.sucursales : [];
        const tableVariants = Array.isArray(producto?.tableVariants) ? producto.tableVariants : [];
        const currentBranch = branches.find((branch: any) => getBranchId(branch) === String(sucursalId));
        const orderedBranches = [
            ...(currentBranch ? [currentBranch] : []),
            ...branches.filter((branch: any) => branch !== currentBranch)
        ];
        const duplicateIdentityByBranch = new Set<string>();

        orderedBranches.forEach((branch: any) => {
            const counts = new Map<string, number>();
            (branch?.combinaciones || []).forEach((combination: any) => {
                const identity = buildVariantIdentity(combination);
                if (!identity) return;
                counts.set(identity, (counts.get(identity) || 0) + 1);
            });

            counts.forEach((count, identity) => {
                if (count > 1) duplicateIdentityByBranch.add(identity);
            });
        });

        const rowMap = new Map<string, any>();
        const identityRowMap = new Map<string, string>();
        const setVariantRow = (row: any, fallbackKey: string) => {
            const identity = buildVariantIdentity(row);
            const shouldPreserveDuplicates = identity && duplicateIdentityByBranch.has(identity);
            const existingKey = !shouldPreserveDuplicates && identity ? identityRowMap.get(identity) : '';
            const key = existingKey || fallbackKey;

            if (!existingKey && identity && !shouldPreserveDuplicates) {
                identityRowMap.set(identity, key);
            }

            if (rowMap.has(key)) return;
            rowMap.set(key, row);
        };

        tableVariants.forEach((variantRow: any, index: number) => {
            const variantes = variantRow?.variantes_obj || variantRow?.variantes || {};
            const key = buildCombinationKey(productId, {
                variantKey: variantRow?.variantKey,
                variantes
            }, index);

            setVariantRow({
                key,
                variantKey: variantRow?.variantKey,
                variantes,
                label: variantRow?.variant || getVariantLabel(variantes) || `Variante ${rowMap.size + 1}`,
                precio: Number(variantRow?.precio || 0)
            }, key);
        });

        orderedBranches.forEach((branch: any) => {
            (branch?.combinaciones || []).forEach((combination: any, index: number) => {
                const key = buildCombinationKey(productId, combination, index);

                setVariantRow({
                    key,
                    variantKey: combination.variantKey,
                    variantes: combination.variantes || {},
                    label: getVariantLabel(combination.variantes || {}) || `Variante ${rowMap.size + 1}`,
                    precio: Number(combination.precio || 0)
                }, key);
            });
        });

        const nextRows = Array.from(rowMap.values());

        setRows(nextRows);
        setBulkPrice(null);
        setSearchTerm('');
        setPageSize(PRICE_MATRIX_PAGE_SIZE);
    }, [visible, producto]);

    const hasRows = rows.length > 0;
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const filteredRows = useMemo(() => {
        if (!normalizedSearchTerm) return rows;

        return rows.filter((row) => row.label.toLowerCase().includes(normalizedSearchTerm));
    }, [normalizedSearchTerm, rows]);
    const visibleRowKeys = useMemo(() => new Set(filteredRows.map((row) => row.key)), [filteredRows]);
    const hasVisibleRows = filteredRows.length > 0;
    const shouldPaginate = filteredRows.length > PRICE_MATRIX_PAGE_SIZE;

    const applyBulkPrice = () => {
        if (bulkPrice === null || bulkPrice < 0 || !hasVisibleRows) return;

        setRows((currentRows) =>
            currentRows.map((row) => ({
                ...row,
                precio: visibleRowKeys.has(row.key) ? bulkPrice : row.precio
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
            style={{ top: 24 }}
            bodyStyle={{ maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}
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
                        Edita los precios por variante o aplica un mismo valor a todas. {rows.length} variantes cargadas.
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
                                    Filtra por variante o subvariante y aplica un mismo precio solo a las visibles.
                                </Typography.Text>
                            </div>

                            <Space wrap size={[8, 8]}>
                                <Input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar variante o subvariante"
                                    allowClear
                                    style={{ width: 240 }}
                                />
                                <InputNumber
                                    min={0}
                                    value={bulkPrice}
                                    onChange={(value) => setBulkPrice(value ?? null)}
                                    placeholder="Precio para visibles"
                                />
                                <Button
                                    type="primary"
                                    onClick={applyBulkPrice}
                                    disabled={bulkPrice === null || !hasVisibleRows}
                                >
                                    Aplicar
                                </Button>
                            </Space>
                        </Space>
                    </div>
                )}

                <Table
                    rowKey="key"
                    pagination={
                        shouldPaginate
                            ? {
                                pageSize,
                                defaultPageSize: PRICE_MATRIX_PAGE_SIZE,
                                pageSizeOptions: ['25', '50', '100'],
                                showSizeChanger: true,
                                onChange: (_page, nextPageSize) => setPageSize(nextPageSize),
                                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} variantes`
                            }
                            : false
                    }
                    scroll={{ x: true }}
                    dataSource={filteredRows}
                    locale={{
                        emptyText: hasRows
                            ? 'No hay variantes que coincidan con el filtro.'
                            : 'Este producto no tiene variantes para editar.'
                    }}
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
