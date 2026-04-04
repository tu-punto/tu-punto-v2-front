import { useEffect, useState } from 'react';
import { AutoComplete, InputNumber, Table, Button, Tag, Typography, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const VariantInputs = ({
    combinations,
    setCombinations,
    readOnlyCombinations = [],
    startEmpty = false,
    variantSuggestions = [],
    subvariantSuggestions = {},
    prefillCombination = null,
    resetKey,
}: any) => {
    const [variants, setVariants] = useState<any[]>([]);
    const [inputValues, setInputValues] = useState<string[]>([]);
    const [subvariantPriceInputs, setSubvariantPriceInputs] = useState<(number | null)[]>([]);
    const [selectedSubvariants, setSelectedSubvariants] = useState<(string | null)[]>([]);
    const [bulkPrice, setBulkPrice] = useState<number | null>(null);
    const [showBulkPriceTools, setShowBulkPriceTools] = useState(false);

    useEffect(() => {
        if (!startEmpty || resetKey === undefined) return;

        const nextVariants = prefillCombination
            ? Object.entries(prefillCombination).map(([name, value]) => ({
                name,
                subvariants: [String(value)],
                readOnly: false,
            }))
            : [];

        setVariants(nextVariants);
        setInputValues(nextVariants.map(() => ""));
        setSubvariantPriceInputs(nextVariants.map(() => null));
        setSelectedSubvariants(nextVariants.map(() => null));
        setBulkPrice(null);
        setShowBulkPriceTools(false);
        setCombinations([]);
    }, [prefillCombination, resetKey, setCombinations, startEmpty]);

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
        setSubvariantPriceInputs(formatted.map(() => null));
        setSelectedSubvariants(formatted.map(() => null));
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
        setSubvariantPriceInputs([...subvariantPriceInputs, null]);
        setSelectedSubvariants([...selectedSubvariants, null]);
    };

    const removeVariant = (index: number) => {
        const updated = [...variants];
        updated.splice(index, 1);
        setVariants(updated);

        const updatedInputs = [...inputValues];
        updatedInputs.splice(index, 1);
        setInputValues(updatedInputs);

        const updatedSubvariantPrices = [...subvariantPriceInputs];
        updatedSubvariantPrices.splice(index, 1);
        setSubvariantPriceInputs(updatedSubvariantPrices);

        const updatedSelectedSubvariants = [...selectedSubvariants];
        updatedSelectedSubvariants.splice(index, 1);
        setSelectedSubvariants(updatedSelectedSubvariants);
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
        updated[variantIndex].subvariants = updated[variantIndex].subvariants.filter(
            (subvariant: string) => subvariant !== value
        );
        setVariants(updated);

        if (selectedSubvariants[variantIndex] === value) {
            updateSubvariantPriceInput(variantIndex, null);
            selectSubvariant(variantIndex, null);
        }
    };

    useEffect(() => {
        const generateCombinations = (index = 0, path: any[] = [], result: any[] = []) => {
            if (index === variants.length) {
                const combination: any = {
                    key: path.map((part) => `${part.name}-${part.value}`).join('-'),
                    stock: undefined,
                    price: undefined,
                };

                path.forEach((part, pathIndex) => {
                    combination[`var${pathIndex}`] = part.value;
                    combination[`varName${pathIndex}`] = part.name;
                });

                result.push(combination);
                return;
            }

            for (const value of variants[index].subvariants) {
                generateCombinations(index + 1, [...path, { name: variants[index].name, value }], result);
            }
        };

        const result: any[] = [];
        if (variants.length > 0 && variants.every((variant) => variant.subvariants.length && variant.name)) {
            generateCombinations(0, [], result);
        }

        const normalizedReadOnly = startEmpty
            ? []
            : readOnlyCombinations.map((combo: any) => {
                const key = Object.entries(combo)
                    .filter(([comboKey]) => comboKey.startsWith('varName'))
                    .map((_, index) => `${combo[`varName${index}`]}-${combo[`var${index}`]}`)
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
                .filter((combo) => !lockedKeys.has(combo.key))
                .map((combo) => {
                    const previous = previousByKey.get(combo.key);
                    return previous ? { ...combo, stock: previous.stock, price: previous.price } : combo;
                });

            return startEmpty
                ? generatedCombinations
                : [...normalizedReadOnly, ...generatedCombinations];
        });
    }, [variants, readOnlyCombinations, setCombinations, startEmpty]);

    const handleChange = (key: string, field: 'stock' | 'price', value: number | null) => {
        const updated = combinations.map((combo: any) =>
            combo.key === key ? { ...combo, [field]: value } : combo
        );
        setCombinations(updated);

        if (field === "price" && value !== null && value > 0 && bulkPrice === null) {
            setBulkPrice(value);
        }
    };

    const editableCombinations = combinations.filter((combo: any) => !combo.disabled);

    const applyBulkPrice = () => {
        if (bulkPrice === null || bulkPrice < 0) return;

        const updated = combinations.map((combo: any) =>
            combo.disabled ? combo : { ...combo, price: bulkPrice }
        );
        setCombinations(updated);
        setBulkPrice(null);
    };

    const updateSubvariantPriceInput = (index: number, value: number | null) => {
        const updated = [...subvariantPriceInputs];
        updated[index] = value;
        setSubvariantPriceInputs(updated);
    };

    const selectSubvariant = (variantIndex: number, value: string | null) => {
        const updated = [...selectedSubvariants];
        updated[variantIndex] = value;
        setSelectedSubvariants(updated);
    };

    const applySubvariantPrice = (variantIndex: number) => {
        const nextPrice = subvariantPriceInputs[variantIndex];
        const variantName = variants[variantIndex]?.name;
        const selectedSubvariant = selectedSubvariants[variantIndex];
        if (nextPrice === null || nextPrice < 0 || !variantName || !selectedSubvariant) return;

        const updated = combinations.map((combo: any) => {
            const affectsCombination =
                !combo.disabled &&
                Object.keys(combo)
                    .filter((key) => key.startsWith('varName'))
                    .some((key) => {
                        const suffix = key.replace('varName', '');
                        return combo[key] === variantName && combo[`var${suffix}`] === selectedSubvariant;
                    });

            return affectsCombination ? { ...combo, price: nextPrice } : combo;
        });

        setCombinations(updated);
        updateSubvariantPriceInput(variantIndex, null);
        selectSubvariant(variantIndex, null);
    };

    const submitSubvariantInput = (variantIndex: number) => {
        const pendingValue = String(inputValues[variantIndex] || '').trim();
        if (!pendingValue) return;

        addSubvariant(variantIndex, pendingValue);

        const updated = [...inputValues];
        updated[variantIndex] = "";
        setInputValues(updated);
    };

    const dynamicColumns = variants.map((variant, index) => ({
        title: variant.name || `Var${index + 1}`,
        dataIndex: `var${index}`,
        key: `var${index}`,
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
            dataIndex: 'price',
            key: 'price',
            title: (
                <span
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setShowBulkPriceTools((current) => !current)}
                >
                    Precio
                </span>
            ),
            render: (_: any, record: any) => (
                <InputNumber
                    min={0}
                    value={record.price}
                    onChange={(value) => handleChange(record.key, 'price', value)}
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
                                <>
                                    <Button icon={<DeleteOutlined />} danger onClick={() => removeVariant(index)} />
                                </>
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
                            {variant.subvariants.map((subvariant: string) => (
                                <Tag
                                    closable={!variant.readOnly}
                                    onClose={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeSubvariant(index, subvariant);
                                    }}
                                    key={subvariant}
                                    color={selectedSubvariants[index] === subvariant ? 'blue' : undefined}
                                    style={{ cursor: variant.readOnly ? 'default' : 'pointer' }}
                                    onClick={() => {
                                        if (variant.readOnly) return;
                                        selectSubvariant(
                                            index,
                                            selectedSubvariants[index] === subvariant ? null : subvariant
                                        );
                                    }}
                                >
                                    {subvariant}
                                </Tag>
                            ))}
                        </Space>

                        {!variant.readOnly && selectedSubvariants[index] && (
                            <Space wrap>
                                <Typography.Text type="secondary">
                                    Precio para {selectedSubvariants[index]}
                                </Typography.Text>
                                <InputNumber
                                    min={0}
                                    value={subvariantPriceInputs[index]}
                                    onChange={(value) => updateSubvariantPriceInput(index, value ?? null)}
                                    placeholder="Precio"
                                    style={{ width: 110 }}
                                />
                                <Button
                                    type="primary"
                                    onClick={() => applySubvariantPrice(index)}
                                    disabled={subvariantPriceInputs[index] === null}
                                >
                                    Aplicar
                                </Button>
                            </Space>
                        )}

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
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    submitSubvariantInput(index);
                                }}
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                disabled={!variant.name || !String(inputValues[index] || '').trim()}
                                onClick={() => {
                                    submitSubvariantInput(index);
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

                {editableCombinations.length > 0 && showBulkPriceTools && (
                    <div
                        style={{
                            marginBottom: 16,
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
                                    Aplica el mismo precio a las {editableCombinations.length} combinaciones nuevas sin interrumpir la edicion.
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
                                <Button onClick={() => setBulkPrice(null)} disabled={bulkPrice === null}>
                                    Limpiar
                                </Button>
                            </Space>
                        </Space>
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
