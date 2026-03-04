import { useMemo, useState } from "react";
import { Table, Select, Input, Switch } from "antd";
import VariantInfoModal from "./VariantInfoModal.tsx";

type BranchOption = {
    _id: string;
    nombre: string;
};

type Props = {
    productsList: any[];
    loading?: boolean;
    sucursalId: string;
    setSucursalId: (value: string) => void;
    branches?: BranchOption[];
    categories?: any[];
    searchText: string;
    setSearchText: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
    onUpdateProducts?: () => Promise<void>;
};

const ProductTableSeller = ({
    productsList,
    loading = false,
    sucursalId,
    setSucursalId,
    branches = [],
    categories = [],
    searchText,
    setSearchText,
    selectedCategory,
    setSelectedCategory
}: Props) => {
    const [filterAvailableStock, setFilterAvailableStock] = useState(false);
    const [selectedProductForList, setSelectedProductForList] = useState<string>("all");
    const [showProductInfoModal, setShowProductInfoModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>();

    const normalizedRows = useMemo(() => {
        const base = Array.isArray(productsList) ? productsList : [];
        return base.map((row: any, idx: number) => ({
            ...row,
            variant: row?.variante || "",
            nombre_categoria: row?.categoria || "Sin categoria",
            key: row?.variantKey
                ? `${row._id}-${row.sucursalId}-${row.variantKey}`
                : `${row._id}-${row.sucursalId}-${idx}`
        }));
    }, [productsList]);

    const productOptions = useMemo(() => {
        const map = new Map<string, string>();
        normalizedRows.forEach((row: any) => {
            if (!row?._id) return;
            if (!map.has(String(row._id))) {
                map.set(String(row._id), row.nombre_producto || "Producto");
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [normalizedRows]);

    const tableRows = useMemo(() => {
        const text = searchText.trim().toLowerCase();
        const filtered = normalizedRows.filter((row: any) => {
            if (sucursalId !== "all" && String(row.sucursalId) !== String(sucursalId)) return false;
            if (selectedCategory !== "all" && String(row.id_categoria) !== String(selectedCategory)) return false;
            if (selectedProductForList !== "all" && String(row._id) !== String(selectedProductForList)) return false;
            if (filterAvailableStock && Number(row.stock || 0) <= 0) return false;
            if (!text) return true;
            const nombre = String(row.nombre_producto || "").toLowerCase();
            const variante = String(row.variant || "").toLowerCase();
            return nombre.includes(text) || variante.includes(text);
        });

        const grouped = new Map<string, any[]>();
        filtered.forEach((row: any) => {
            const groupKey = String(row._id || row.nombre_producto || "");
            if (!grouped.has(groupKey)) grouped.set(groupKey, []);
            grouped.get(groupKey)?.push(row);
        });

        const list: any[] = [];
        Array.from(grouped.values()).forEach((rows) => {
            if (!rows.length) return;
            const head = rows[0];
            list.push({
                key: `cabecera-${head._id}`,
                esCabecera: true,
                nombre_producto: head.nombre_producto
            });
            rows.forEach((r) => list.push({ ...r, esCabecera: false }));
        });

        return list;
    }, [
        normalizedRows,
        sucursalId,
        selectedCategory,
        selectedProductForList,
        filterAvailableStock,
        searchText
    ]);

    const columns = [
        {
            dataIndex: "isAvailable",
            key: "isAvailable",
            width: 40,
            render: (_: any, record: any) => {
                if (record.esCabecera) return { props: { colSpan: 0 } };
                const color = Number(record.stock || 0) > 0 ? "bg-green-500" : "bg-red-500";
                return {
                    children: <div className={`w-4 h-4 rounded-full ${color}`} />
                };
            }
        },
        {
            title: "Producto",
            dataIndex: "nombre_producto",
            key: "nombre_producto",
            render: (_: any, record: any) => {
                if (record.esCabecera) {
                    return {
                        children: <b style={{ fontSize: "16px" }}>{record.nombre_producto}</b>,
                        props: {
                            colSpan: 5,
                            style: { backgroundColor: "#f0f2f5" }
                        }
                    };
                }
                return `-> ${record.nombre_producto} - ${record.variant}`;
            }
        },
        {
            title: "Stock actual",
            key: "stock",
            render: (_: any, record: any) =>
                record.esCabecera ? { children: null, props: { colSpan: 0 } } : <span>{record.stock}</span>
        },
        {
            title: "Precio Unitario",
            key: "precio",
            render: (_: any, record: any) =>
                record.esCabecera ? { children: null, props: { colSpan: 0 } } : <span>{record.precio}</span>
        },
        {
            title: "Categoria",
            dataIndex: "nombre_categoria",
            key: "nombre_categoria",
            render: (_: any, record: any) =>
                record.esCabecera
                    ? { children: null, props: { colSpan: 0 } }
                    : (record.nombre_categoria || "Sin categoria")
        }
    ];

    return (
        <>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                <Select
                    value={sucursalId}
                    onChange={setSucursalId}
                    style={{ width: 240 }}
                    placeholder="Seleccionar sucursal"
                >
                    {branches.map((branch) => (
                        <Select.Option key={branch._id} value={branch._id}>
                            {branch.nombre}
                        </Select.Option>
                    ))}
                </Select>
                <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    style={{ width: 240 }}
                >
                    <Select.Option value="all">Todas las categorias</Select.Option>
                    {categories.map((cat: any) => (
                        <Select.Option key={cat._id} value={cat._id}>
                            {cat.categoria}
                        </Select.Option>
                    ))}
                </Select>
                <Select
                    value={selectedProductForList}
                    onChange={setSelectedProductForList}
                    style={{ width: 240 }}
                >
                    <Select.Option value="all">Todos los productos</Select.Option>
                    {productOptions.map((product) => (
                        <Select.Option key={product.id} value={product.id}>
                            {product.name}
                        </Select.Option>
                    ))}
                </Select>
                <Input
                    placeholder="Buscar producto o variante..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                />
                <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                    <span>Ocultar productos sin stock disponible:</span>
                    <Switch
                        checked={filterAvailableStock}
                        onChange={(checked: boolean) => setFilterAvailableStock(checked)}
                    />
                </div>
            </div>

            <Table
                columns={columns as any}
                dataSource={tableRows}
                loading={loading}
                pagination={{ pageSize: 100 }}
                rowKey="key"
                onRow={(record) => ({
                    onClick: () => {
                        if (!record.esCabecera) {
                            setSelectedRecord(record);
                            setShowProductInfoModal(true);
                        }
                    }
                })}
            />

            <VariantInfoModal
                visible={showProductInfoModal}
                onClose={() => setShowProductInfoModal(false)}
                rowRecord={selectedRecord}
            />
        </>
    );
};

export default ProductTableSeller;
