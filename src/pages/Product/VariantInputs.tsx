import { useState, useEffect } from 'react';
import { AutoComplete, Input, InputNumber, Table, Button, Tag, Typography, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const VariantInputs = ({
                           combinations,
                           setCombinations,
                           readOnlyCombinations = [],
                           startEmpty = false,
                           variantSuggestions = [],
                           subvariantSuggestions = {},
                           resetKey,
                       }: any) => {
    const [variants, setVariants] = useState<any[]>([]);
    const [inputValues, setInputValues] = useState<string[]>([]);
    const [showBulkApply, setShowBulkApply] = useState(false);
    const [bulkPrice, setBulkPrice] = useState<number | null>(null);

    useEffect(() => {
        if (resetKey === undefined) return;

        setVariants([]);
        setInputValues([]);
        setShowBulkApply(false);
        setBulkPrice(null);
        setCombinations([]);
    }, [resetKey, setCombinations]);

    useEffect(() => {
        if (startEmpty || resetKey !== undefined) return;
        if (!readOnlyCombinations.length) return;

        const variantMap: Record<string, Set<string>> = {};
        readOnlyCombinations.forEach((combo: any) => {
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
        setInputValues(formatted.map(() => ""));
    }, [readOnlyCombinations, resetKey, startEmpty]);

    const normalizeText = (value: string) => value.trim().toLowerCase();

    const getVariantNameOptions = (index: number) => {
        const currentValue = normalizeText(variants[index]?.name || '');
        const usedByOthers = new Set(
            variants
                .map((variant, variantIndex) =>
                    variantIndex === index ? '' : normalizeText(variant.name || '')
                )
                .filter(Boolean)
        );

        return variantSuggestions
            .filter((name: string) => {
                const normalized = normalizeText(name);
                return !usedByOthers.has(normalized) || normalized === currentValue;
            })
            .map((name: string) => ({ value: name }));
    };

    const getSuggestedSubvariants = (variantName: string, variantIndex: number) => {
        const key = normalizeText(variantName);
        const suggestions = subvariantSuggestions[key] || [];
        const currentValues = new Set(
            (variants[variantIndex]?.subvariants || []).map((value: string) => normalizeText(value))
        );

        return suggestions.filter((value: string) => !currentValues.has(normalizeText(value)));
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', subvariants: [], readOnly: false }]);
        setInputValues([...inputValues, ""]);
    };
    const removeVariant = (index: number) => {
        const updated = [...variants];
        updated.splice(index, 1);
        setVariants(updated);
        const updatedInputs = [...inputValues];
        updatedInputs.splice(index, 1);
        setInputValues(updatedInputs);
    };

    const updateVariantName = (index: number, name: string) => {
        const updated = [...variants];
        updated[index].name = name;
        setVariants(updated);
    };

    const addSubvariant = (variantIndex: number, value: string) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return;

        const updated = [...variants];
        const existingValues = updated[variantIndex].subvariants.map((subvariant: string) =>
            normalizeText(subvariant)
        );
        if (!existingValues.includes(normalizeText(trimmedValue))) {
            updated[variantIndex].subvariants.push(trimmedValue);
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
                    stock: undefined,
                    price: undefined,
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
        if (variants.length > 0 && variants.every(v => v.subvariants.length && v.name)) {
            generateCombinations(0, [], result);
        }

        const normalizedReadOnly = startEmpty ? [] : readOnlyCombinations.map((combo: any) => {
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

        setCombinations((previousCombinations: any[]) => {
            const previousByKey = new Map(
                (previousCombinations || [])
                    .filter((combo: any) => !combo.disabled)
                    .map((combo: any) => [combo.key, combo])
            );
            const lockedKeys = new Set(normalizedReadOnly.map((combo: any) => combo.key));
            const generatedCombinations = result
                .filter(combo => !lockedKeys.has(combo.key))
                .map(combo => {
                    const previous = previousByKey.get(combo.key);
                    return previous ? { ...combo, stock: previous.stock, price: previous.price } : combo;
                });

            return startEmpty
                ? generatedCombinations
                : [...normalizedReadOnly, ...generatedCombinations];
        });
    }, [variants, readOnlyCombinations, setCombinations, startEmpty]);

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
                    onChange={(value) => handleChange(record.key, 'stock', value)}
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
                            <AutoComplete
                                style={{ width: 260 }}
                                options={getVariantNameOptions(index)}
                                value={variant.name}
                                onChange={(value) => updateVariantName(index, value)}
                                disabled={variant.readOnly}
                                placeholder="Nombre de la variante (ej: Color)"
                                filterOption={(inputValue, option) =>
                                    String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
                                }
                            />
                            {!variant.readOnly && (
                                <Button icon={<DeleteOutlined />} danger onClick={() => removeVariant(index)} />
                            )}
                        </Space>
                        {!variant.readOnly && getVariantNameOptions(index).length > 0 && (
                            <Space wrap size={[4, 4]}>
                                <Typography.Text type="secondary">Sugeridas:</Typography.Text>
                                {getVariantNameOptions(index).map((option: any) => (
                                    <Tag
                                        key={option.value}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => updateVariantName(index, option.value)}
                                    >
                                        {option.value}
                                    </Tag>
                                ))}
                            </Space>
                        )}
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
                        {!variant.readOnly && getSuggestedSubvariants(variant.name, index).length > 0 && (
                            <Space wrap size={[4, 4]}>
                                <Typography.Text type="secondary">Subvariantes sugeridas:</Typography.Text>
                                {getSuggestedSubvariants(variant.name, index).map((suggestion: string) => (
                                    <Tag
                                        key={`${variant.name}-${suggestion}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => addSubvariant(index, suggestion)}
                                    >
                                        {suggestion}
                                    </Tag>
                                ))}
                            </Space>
                        )}
                        <Space.Compact style={{ width: '100%', maxWidth: 420 }}>
                            <AutoComplete
                                style={{ width: '100%' }}
                                value={inputValues[index] || ""}
                                options={getSuggestedSubvariants(variant.name, index).map((value: string) => ({
                                    value
                                }))}
                                onChange={(value) => {
                                    const updated = [...inputValues];
                                    updated[index] = value;
                                    setInputValues(updated);
                                }}
                                onSelect={(value) => {
                                    addSubvariant(index, value);
                                    const updated = [...inputValues];
                                    updated[index] = "";
                                    setInputValues(updated);
                                }}
                                placeholder={`Agregar subvariante a ${variant.name || 'Variante'}`}
                                disabled={!variant.name}
                                filterOption={(inputValue, option) =>
                                    String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
                                }
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                disabled={!variant.name || !String(inputValues[index] || '').trim()}
                                onClick={() => {
                                    addSubvariant(index, inputValues[index] || '');
                                    const updated = [...inputValues];
                                    updated[index] = "";
                                    setInputValues(updated);
                                }}
                            />
                        </Space.Compact>
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
