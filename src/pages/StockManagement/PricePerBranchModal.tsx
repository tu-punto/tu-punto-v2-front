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
                                 onRefresh
}: {
    visible: boolean;
    onClose: () => void;
    variantName: string;
    producto: any;
}) => {
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [globalPrice, setGlobalPrice] = useState<number | null>(null);
    useEffect(() => {
        if (!visible) {
            setGlobalPrice(null);
        }
    }, [visible]);

    useEffect(() => {
        if (visible && variantName && producto) {
            fetchData();
        }
    }, [visible, variantName, producto]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const sucursales = await getSucursalsAPI();
            const allVariantKeys = Object.keys(
                producto?.sucursales?.[0]?.combinaciones?.[0]?.variantes || {}
            );

            const combinedData = sucursales
                .map((branch: any) => {
                    const sucursalId = branch._id?.$oid || branch._id;
                    const sucursal = producto.sucursales?.find(
                        (s: any) => (s.id_sucursal?.$oid || s.id_sucursal) === sucursalId
                    );

                    const combinacion = sucursal?.combinaciones?.find((c: any) => {
                        const entry = Object.entries(c.variantes || {})
                            .map(([_, v]) => v)
                            .join(" / ");
                        return entry === variantName;
                    });

                    if (!combinacion) return null;

                    return {
                        key: sucursalId,
                        nombre: branch.nombre,
                        precio: combinacion.precio ?? 0,
                        disponible: true,
                        variantes: combinacion.variantes || {},
                    };
                })
                .filter(Boolean);

            setDataSource(combinedData);
        } catch (error) {
            console.error("Error al obtener datos de precios por sucursal:", error);
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
                        .filter(item => item.precio > 0) // o simplemente: true
                        .map((item) => {
                            // Si no hay combinación, usamos variantes del variantName (manual)
                            let variantes = item.variantes;

                            if (!item.disponible || Object.keys(variantes || {}).length === 0) {
                                const variantParts = variantName.split(" / ");
                                const allCombinaciones = producto.sucursales?.flatMap(s => s.combinaciones) || [];
                                const keysSet = new Set<string>();
                                allCombinaciones.forEach(c => {
                                    Object.keys(c.variantes || {}).forEach(k => keysSet.add(k));
                                });
                                const keys = Array.from(keysSet);
                                variantes = Object.fromEntries(keys.map((k, i) => [k, variantParts[i] || ""]));
                            }

                            return {
                                productId: producto._id?.$oid || producto._id,
                                sucursalId: item.key,
                                variantes,
                                precio: item.precio,
                            };
                        });
                    console.log("📤 Enviando priceUpdates:", priceUpdates);

                    const res = await updateProductPriceAPI(priceUpdates);

                    if (res.success) {
                        message.success('Precios actualizados correctamente');
                        onClose();
                        onRefresh?.();
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
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Precio para todas las sucursales:</span>
                <InputNumber
                    min={0}
                    value={globalPrice}
                    onChange={(value) => setGlobalPrice(value ?? null)}
                    placeholder="Ej. 10.00"
                />
                <Button
                    onClick={() => {
                        if (globalPrice == null || globalPrice < 0) {
                            message.warning("Ingrese un precio válido");
                            return;
                        }
                        const actualizadas = dataSource.map((item) =>
                            item.disponible ? { ...item, precio: globalPrice } : item
                        );
                        setDataSource(actualizadas);
                    }}
                    type="default"
                >
                    Aplicar a todos
                </Button>
            </div>

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
