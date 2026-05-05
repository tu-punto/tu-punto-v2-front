import { useEffect, useMemo, useState, type Key } from "react";
import { Button, Input, InputNumber, Modal, Select, Table, Tag, message } from "antd";
import { createStockWithdrawalRequestAPI } from "../../api/stockWithdrawal";

type BranchOption = {
    _id: string;
    nombre: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
    products: any[];
    branches: BranchOption[];
    defaultBranchId?: string;
};

const buildVariantLabel = (row: any) => {
    const label = String(row?.variante || row?.variant || "").trim();
    if (label) return label;
    const variantes = row?.variantes_obj || row?.variantes || {};
    return Object.entries(variantes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" - ");
};

const SellerWithdrawalRequestModal = ({
    visible,
    onClose,
    onCreated,
    products,
    branches,
    defaultBranchId
}: Props) => {
    const [branchId, setBranchId] = useState<string>("");
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setBranchId(String(defaultBranchId || branches[0]?._id || ""));
        setSelectedRowKeys([]);
        setQuantities({});
        setComment("");
    }, [visible, defaultBranchId, branches]);

    const rows = useMemo(() => {
        return (Array.isArray(products) ? products : [])
            .filter((row: any) => String(row?.sucursalId || "") === String(branchId || ""))
            .filter((row: any) => Number(row?.stock || 0) > 0)
            .map((row: any, index: number) => {
                const key = row?.variantKey
                    ? `${row._id}-${row.sucursalId}-${row.variantKey}`
                    : `${row._id}-${row.sucursalId}-${index}`;
                return {
                    ...row,
                    key,
                    variantLabel: buildVariantLabel(row)
                };
            });
    }, [products, branchId]);

    const selectedRows = useMemo(() => {
        const keys = new Set(selectedRowKeys.map(String));
        return rows.filter((row: any) => keys.has(String(row.key)));
    }, [rows, selectedRowKeys]);

    const handleQuantityChange = (key: string, value: number | null) => {
        setQuantities((prev) => ({
            ...prev,
            [key]: Number(value || 1)
        }));
    };

    const handleSubmit = async () => {
        if (!branchId) {
            message.warning("Selecciona una sucursal.");
            return;
        }
        if (selectedRows.length === 0) {
            message.warning("Selecciona al menos un producto.");
            return;
        }

        const items = selectedRows.map((row: any) => {
            const quantity = Number(quantities[row.key] || 1);
            return {
                productId: String(row._id),
                variantKey: row.variantKey,
                variantLabel: row.variantLabel,
                variantes: row.variantes_obj || row.variantes || {},
                quantity
            };
        });

        const invalid = items.some((item, index) => {
            const stock = Number(selectedRows[index]?.stock || 0);
            return item.quantity <= 0 || item.quantity > stock;
        });
        if (invalid) {
            message.warning("Revisa las cantidades solicitadas.");
            return;
        }

        setLoading(true);
        const res = await createStockWithdrawalRequestAPI({
            branchId,
            items,
            comment: comment.trim() || undefined
        });
        setLoading(false);

        if (res?.success === false) {
            message.error(res?.message || "No se pudo crear la solicitud de salida.");
            return;
        }

        message.success("Solicitud de salida registrada.");
        onCreated();
        onClose();
    };

    const columns = [
        {
            title: "Producto",
            dataIndex: "nombre_producto",
            key: "nombre_producto",
            render: (value: string, record: any) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{value}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>{record.variantLabel || "Sin variante"}</div>
                </div>
            )
        },
        {
            title: "Stock",
            dataIndex: "stock",
            key: "stock",
            width: 90,
            render: (value: number) => <Tag color={Number(value || 0) > 0 ? "green" : "red"}>{value}</Tag>
        },
        {
            title: "Cantidad a sacar",
            key: "quantity",
            width: 170,
            render: (_: any, record: any) => (
                <InputNumber
                    min={1}
                    max={Number(record.stock || 1)}
                    value={quantities[record.key] || 1}
                    onChange={(value) => handleQuantityChange(record.key, value)}
                    disabled={!selectedRowKeys.map(String).includes(String(record.key))}
                    style={{ width: "100%" }}
                />
            )
        }
    ];

    return (
        <Modal
            open={visible}
            title="Solicitar salida de productos"
            onCancel={onClose}
            width={900}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    Guardar solicitud
                </Button>
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Select
                    value={branchId || undefined}
                    onChange={(value) => {
                        setBranchId(value);
                        setSelectedRowKeys([]);
                        setQuantities({});
                    }}
                    placeholder="Selecciona la sucursal de salida"
                    style={{ width: "100%" }}
                >
                    {branches.map((branch) => (
                        <Select.Option key={branch._id} value={branch._id}>
                            {branch.nombre}
                        </Select.Option>
                    ))}
                </Select>

                <Table
                    columns={columns as any}
                    dataSource={rows}
                    rowKey="key"
                    pagination={{ pageSize: 8 }}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys)
                    }}
                    locale={{ emptyText: "No hay productos con stock en esta sucursal." }}
                />

                <Input.TextArea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Comentario opcional para el encargado"
                    rows={3}
                    maxLength={300}
                    showCount
                />
            </div>
        </Modal>
    );
};

export default SellerWithdrawalRequestModal;
