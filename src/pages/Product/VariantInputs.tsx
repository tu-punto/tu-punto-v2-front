import { useState, useEffect } from 'react';
import { Input, InputNumber, Table, Button, Tag, Typography, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const VariantInputs = ({ combinations, setCombinations }: any) => {
    const [variants, setVariants] = useState<any[]>([]);

    const addVariant = () => {
        setVariants([...variants, { name: '', subvariants: [] }]);
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
                    price: 0
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
        setCombinations(result);
    }, [variants]);

    const handleChange = (key: string, field: 'stock' | 'price', value: number) => {
        const updated = combinations.map((combo: any) =>
            combo.key === key ? { ...combo, [field]: value } : combo
        );
        setCombinations(updated);
    };

    // columnas dinámicas según cantidad de variantes
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
            render: (text, record) => (
                <InputNumber
                    min={0}
                    value={record.stock}
                    onChange={(value) => handleChange(record.key, 'stock', value || 0)}
                />
            )
        },
        {
            title: 'Precio',
            dataIndex: 'price',
            render: (text, record) => (
                <InputNumber
                    min={0}
                    value={record.price}
                    onChange={(value) => handleChange(record.key, 'price', value || 0)}
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
                            />
                            <Button icon={<DeleteOutlined />} danger onClick={() => removeVariant(index)} />
                        </Space>
                        <Space wrap>
                            {variant.subvariants.map((sv: string) => (
                                <Tag
                                    closable
                                    onClose={() => removeSubvariant(index, sv)}
                                    key={sv}
                                >
                                    {sv}
                                </Tag>
                            ))}
                        </Space>
                        <Input.Search
                            placeholder={`Agregar subvariante a ${variant.name || 'Variante'}`}
                            enterButton={<PlusOutlined />}
                            onSearch={(val) => val && addSubvariant(index, val)}
                        />
                    </Space>
                </div>
            ))}
            <Button icon={<PlusOutlined />} onClick={addVariant}>
                Agregar Variante
            </Button>

            <div style={{ marginTop: 24 }}>
                <Typography.Title level={5}>Combinaciones</Typography.Title>
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
