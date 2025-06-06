import { useState, useEffect } from 'react';
import { Input, InputNumber, Table, Button, Tag, Typography, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const VariantInputs = ({
                           combinations,
                           setCombinations,
                           readOnlyCombinations = [],
                       }: any) => {
    const [variants, setVariants] = useState<any[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [inputValues, setInputValues] = useState<string[]>([]);
    const [showBulkApply, setShowBulkApply] = useState(false);
    const [bulkPrice, setBulkPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!initialized && readOnlyCombinations.length) {
            const variantMap: Record<string, Set<string>> = {};
            readOnlyCombinations.forEach(combo => {
                let i = 0;
                while (combo[`varName${i}`] && combo[`var${i}`]) {
                    const name = combo[`varName${i}`];
                    const value = combo[`var${i}`];
                    if (!variantMap[name]) variantMap[name] = new Set();
                    variantMap[name].add(value);
                    i++;
                }
            });

            const formatted = Object.entries(variantMap).map(([name, set]) => ({
                name,
                subvariants: Array.from(set),
                readOnly: true,
            }));

            setVariants(formatted);
            setInitialized(true);
        }
    }, [readOnlyCombinations, initialized]);

    const addVariant = () => {
        setVariants([...variants, { name: '', subvariants: [], readOnly: false }]);
        setInputValues([...inputValues, ""]);
    };
    const removeVariant = (index: number) => {
        const updated = [...variants];
        updated.splice(index, 1);
        setVariants(updated);
    };

    const updateVariantName = (index: number, name: string) => {
        const updated = [...variants];
        updated[index].name = name;
        setVariants(updated);
    };

    const addSubvariant = (variantIndex: number, value: string) => {
        const updated = [...variants];
        if (!updated[variantIndex].subvariants.includes(value)) {
            updated[variantIndex].subvariants.push(value);
        }
        setVariants(updated);
    };

    const removeSubvariant = (variantIndex: number, value: string) => {
        const updated = [...variants];
        updated[variantIndex].subvariants = updated[variantIndex].subvariants.filter((sv: string) => sv !== value);
        setVariants(updated);
    };

    useEffect(() => {
        const generateCombinations = (index = 0, path = [], result = []) => {
            if (index === variants.length) {
                const combination: any = {
                    key: path.map(p => `${p.name}-${p.value}`).join('-'),
                    stock: 0,
                    price: 0,
                };
                path.forEach((p, i) => {
                    combination[`var${i}`] = p.value;
                    combination[`varName${i}`] = p.name;
                });
                result.push(combination);
                return;
            }

            for (const value of variants[index].subvariants) {
                generateCombinations(index + 1, [...path, { name: variants[index].name, value }], result);
            }
        };

        const result: any[] = [];
        if (variants.every(v => v.subvariants.length && v.name)) {
            generateCombinations(0, [], result);
        }

        const normalizedReadOnly = readOnlyCombinations.map(combo => {
            const key = Object.entries(combo)
                .filter(([k]) => k.startsWith('varName'))
                .map((_, i) => `${combo[`varName${i}`]}-${combo[`var${i}`]}`)
                .join('-');
            return {
                ...combo,
                key,
                disabled: true
            };
        });

        const lockedKeys = new Set(normalizedReadOnly.map(c => c.key));
        const finalCombinations = [
            ...normalizedReadOnly,
            ...result.filter(c => !lockedKeys.has(c.key))
        ];

        setCombinations(finalCombinations);
    }, [variants]);

    const handleChange = (key: string, field: 'stock' | 'price', value: number) => {
        const updated = combinations.map((combo: any) =>
            combo.key === key ? { ...combo, [field]: value } : combo
        );
        setCombinations(updated);

        if (field === "price" && value > 0 && bulkPrice === null) {
            setBulkPrice(value);
            setShowBulkApply(true);
        }
    };


    const dynamicColumns = variants.map((variant, i) => ({
        title: variant.name || `Var${i + 1}`,
        dataIndex: `var${i}`,
        key: `var${i}`,
    }));

    const columns = [
        ...dynamicColumns,
        {
            title: 'Stock',
            dataIndex: 'stock',
            render: (_: any, record: any) => (
                <InputNumber
                    min={0}
                    value={record.stock}
                    onChange={(value) => handleChange(record.key, 'stock', value || 0)}
                    disabled={record.disabled}
                />
            )
        },
        {
            title: 'Precio',
            dataIndex: 'price',
            render: (_: any, record: any) => (
                <InputNumber
                    min={0}
                    value={record.price}
                    onChange={(value) => handleChange(record.key, 'price', value || 0)}
                    disabled={record.disabled}
                />
            )
        }
    ];

    return (
        <div style={{ padding: '1rem 0' }}>
            <Typography.Title level={5}>Variantes</Typography.Title>
            {variants.map((variant, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Space wrap>
                            <Input
                                placeholder="Nombre de la variante (ej: Color)"
                                value={variant.name}
                                onChange={(e) => updateVariantName(index, e.target.value)}
                                disabled={variant.readOnly}
                            />
                            {!variant.readOnly && (
                                <Button icon={<DeleteOutlined />} danger onClick={() => removeVariant(index)} />
                            )}
                        </Space>
                        <Space wrap>
                            {variant.subvariants.map((sv: string) => (
                                <Tag
                                    closable={!variant.readOnly}
                                    onClose={() => removeSubvariant(index, sv)}
                                    key={sv}
                                >
                                    {sv}
                                </Tag>
                            ))}
                        </Space>
                        <Input.Search
                            style={{ maxWidth: 300 }}
                            value={inputValues[index] || ""}
                            onChange={(e) => {
                                const updated = [...inputValues];
                                updated[index] = e.target.value;
                                setInputValues(updated);
                            }}
                            onSearch={(val) => {
                                if (val) {
                                    addSubvariant(index, val);
                                    const updated = [...inputValues];
                                    updated[index] = ""; // limpiar campo
                                    setInputValues(updated);
                                }
                            }}
                            placeholder={`Agregar subvariante a ${variant.name || 'Variante'}`}
                            enterButton={<PlusOutlined />}
                                                        disabled={!variant.name}
                        />
                    </Space>
                </div>
            ))}
            <Button icon={<PlusOutlined />} onClick={addVariant}>
                Agregar Variante
            </Button>

            <div style={{ marginTop: 24 }}>
                <Typography.Title level={5}>Combinaciones</Typography.Title>
                {showBulkApply && (
                    <div style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f', padding: 12, borderRadius: 6 }}>
                        <Typography.Text strong>¿Usar este precio para todas las combinaciones?</Typography.Text>
                        <Button
                            type="link"
                            onClick={() => {
                                const updated = combinations.map((combo: any) =>
                                    combo.disabled ? combo : { ...combo, price: bulkPrice }
                                );
                                setCombinations(updated);
                                setShowBulkApply(false);
                                setBulkPrice(null);
                            }}
                        >
                            Aplicar a todas
                        </Button>
                        <Button
                            type="link"
                            danger
                            onClick={() => {
                                setShowBulkApply(false);
                                setBulkPrice(null);
                            }}
                        >
                            Cancelar
                        </Button>
                    </div>
                )}

                <Table
                    dataSource={combinations}
                    rowKey="key"
                    pagination={false}
                    columns={columns}
                    locale={{
                        emptyText: 'Agrega variantes y subvariantes para generar combinaciones.'
                    }}
                    scroll={{ x: true }}
                />
            </div>
        </div>
    );
};

export default VariantInputs;
