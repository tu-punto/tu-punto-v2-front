import { useState, useEffect } from "react";
import { Form, Input, InputNumber, Table, Button, Tag, Select } from "antd";
import { IBranch } from "../../models/branchModel";

const VariantInputs = ({
                           branches,
                           selectedBranches,
                           setSelectedBranches,
                           variantValues,
                           setVariantValues,
                           combinations,
                           setCombinations
                       }: {
    branches: IBranch[],
    selectedBranches: string[],
    setSelectedBranches: (v: string[]) => void,
    variantValues: any,
    setVariantValues: (v: any) => void,
    combinations: any[],
    setCombinations: (c: any[]) => void
}) => {
    const [currentInput, setCurrentInput] = useState<any>({});

    useEffect(() => {
        generateCombinations();
    }, [variantValues, selectedBranches]);

    const handleBranchChange = (value: string[]) => {
        setSelectedBranches(value);
    };

    const handleVariantChange = (branchId: string, value: string) => {
        setCurrentInput((prev: any) => ({
            ...prev,
            [branchId]: value,
        }));
    };

    const confirmVariant = (branchId: string) => {
        const inputValue = currentInput[branchId];
        if (inputValue && (!variantValues[branchId] || !variantValues[branchId].includes(inputValue))) {
            setVariantValues((prev: any) => ({
                ...prev,
                [branchId]: [...(prev[branchId] || []), inputValue],
            }));
            setCurrentInput((prev: any) => ({
                ...prev,
                [branchId]: '',
            }));
        }
    };

    const handleRemoveVariant = (branchId: string, value: string) => {
        setVariantValues((prev: any) => ({
            ...prev,
            [branchId]: prev[branchId].filter((v: string) => v !== value),
        }));
    };

    const generateCombinations = () => {
        const combinationsGenerated: any[] = [];
        selectedBranches.forEach((branchId) => {
            const variants = variantValues[branchId] || [];
            variants.forEach((variant: string, idx: number) => {
                const key = `${branchId}-${idx}`;
                const existing = combinations.find(c => c.key === key) || {};
                combinationsGenerated.push({
                    key,
                    branchId,
                    variant,
                    stock: existing.stock || 0,
                    price: existing.price || 0,
                });
            });
        });
        setCombinations(combinationsGenerated);
    };

    const handleCombinationChange = (key: string, field: string, value: any) => {
        setCombinations(combinations.map(c => c.key === key ? { ...c, [field]: value } : c));
    };

    const columns = [
        {
            title: "Sucursal",
            dataIndex: "branchId",
            render: (val: string) => branches.find(b => b._id === val)?.nombre || val
        },
        {
            title: "Variante",
            dataIndex: "variant",
        },
        {
            title: "Stock",
            dataIndex: "stock",
            render: (text: any, record: any) => (
                <InputNumber min={0} value={text} onChange={(value) => handleCombinationChange(record.key, 'stock', value)} />
            )
        },
        {
            title: "Precio",
            dataIndex: "price",
            render: (text: any, record: any) => (
                <InputNumber min={0} value={text} onChange={(value) => handleCombinationChange(record.key, 'price', value)} />
            )
        },
        {
            title: "Acción",
            render: (_: any, record: any) => (
                <Button danger onClick={() => {
                    setVariantValues((prev: any) => ({
                        ...prev,
                        [record.branchId]: prev[record.branchId].filter((v: string) => v !== record.variant)
                    }));
                }}>Eliminar</Button>
            )
        }
    ];

    return (
        <>
            <Form.Item label="Sucursales">
                <Select
                    mode="multiple"
                    options={branches.map(b => ({ value: b._id, label: b.nombre }))}
                    value={selectedBranches}
                    onChange={handleBranchChange}
                />
            </Form.Item>

            {selectedBranches.map(branchId => (
                <Form.Item key={branchId} label={`Variantes para ${branches.find(b => b._id === branchId)?.nombre}`}>
                    {variantValues[branchId]?.map((v: string) => (
                        <Tag key={v} closable onClose={() => handleRemoveVariant(branchId, v)}>
                            {v}
                        </Tag>
                    ))}
                    <Input
                        value={currentInput[branchId] || ''}
                        onChange={e => handleVariantChange(branchId, e.target.value)}
                        onPressEnter={() => confirmVariant(branchId)}
                        placeholder="Añadir variante"
                    />
                    <Button onClick={() => confirmVariant(branchId)}>Agregar</Button>
                </Form.Item>
            ))}

            <Table columns={columns} dataSource={combinations} pagination={false} />
        </>
    );
};

export default VariantInputs;
