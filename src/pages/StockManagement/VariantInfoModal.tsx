import { Card, Modal, Table, message } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import moment from "moment-timezone";

import { getProductsEntryAmount } from "../../api/entry";
import { getProductByIdAPI } from "../../api/product";
import { getSalesBySellerIdAPI } from "../../api/sales";
import { getSucursalsAPI } from "../../api/sucursal";
import { UserContext } from "../../context/userContext";

type VariantInfoModalProps = {
    visible: boolean;
    onClose: () => void;
    rowRecord?: any;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const collapseWhitespace = (value: string) => {
    let result = "";
    let previousWasWhitespace = false;

    for (const char of value.trim()) {
        const isWhitespace = char.trim() === "";
        if (isWhitespace) {
            if (!previousWasWhitespace) {
                result += " ";
            }
            previousWasWhitespace = true;
            continue;
        }

        result += char;
        previousWasWhitespace = false;
    }

    return result;
};

const stripLeadingSeparators = (value: string) => {
    let index = 0;

    while (index < value.length) {
        const char = value[index];
        const isSeparator = char === "-" || char === ":" || char === "/" || char.trim() === "";
        if (!isSeparator) break;
        index += 1;
    }

    return value.slice(index).trim();
};

const normalizeLabel = (value: unknown) =>
    collapseWhitespace(normalizeText(value))
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const normalizeId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
        return String(value?._id || value?.$oid || value?.id || value?.toString?.() || "");
    }
    return String(value);
};

const toVariantRecord = (input: any): Record<string, string> => {
    if (!input || typeof input !== "object") return {};
    if (input instanceof Map) {
        return Object.fromEntries(
            Array.from(input.entries()).map(([key, value]) => [normalizeText(key), normalizeText(value)])
        );
    }

    return Object.fromEntries(
        Object.entries(input)
            .map(([key, value]) => [normalizeText(key), normalizeText(value)])
            .filter(([key, value]) => key && value)
    );
};

const getVariantLabel = (variantes: Record<string, string>) =>
    Object.values(toVariantRecord(variantes))
        .map((value) => normalizeText(value))
        .filter(Boolean)
        .join(" / ");

const buildVariantLabelCandidates = (productName: string, variantName: string) => {
    const productLabel = normalizeLabel(productName);
    const variantLabel = normalizeLabel(variantName);
    const fullLabel = normalizeLabel(
        variantName && productName ? `${productName} - ${variantName}` : variantName || productName
    );
    const candidates = new Set<string>();

    if (variantLabel) candidates.add(variantLabel);
    if (fullLabel) candidates.add(fullLabel);

    if (productLabel && fullLabel.startsWith(productLabel)) {
        const stripped = stripLeadingSeparators(fullLabel.slice(productLabel.length));
        if (stripped) candidates.add(stripped);
    }

    return candidates;
};

const areVariantsEqual = (left: any, right: any) => {
    const a = toVariantRecord(left);
    const b = toVariantRecord(right);
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length === 0 || keysA.length !== keysB.length) return false;

    return keysA.every((key) => normalizeLabel(a[key]) === normalizeLabel(b[key]));
};

const VariantInfoModal = ({ visible, onClose, rowRecord }: VariantInfoModalProps) => {
    const { user }: any = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [productName, setProductName] = useState("");
    const [variantName, setVariantName] = useState("");
    const [stockData, setStockData] = useState<any[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [entryData, setEntryData] = useState<any[]>([]);

    const normalizedVariant = useMemo(
        () => toVariantRecord(rowRecord?.variantes_obj || rowRecord?.variantes || {}),
        [rowRecord]
    );

    useEffect(() => {
        if (!visible || !rowRecord?._id || !user?.id_vendedor) {
            if (!visible) {
                setStockData([]);
                setSalesData([]);
                setEntryData([]);
                setProductName("");
                setVariantName("");
            }
            return;
        }

        let cancelled = false;

        const loadVariantInfo = async () => {
            setLoading(true);
            try {
                const nextProductName = normalizeText(rowRecord?.nombre_producto || "Producto");
                const nextVariantName = normalizeText(
                    rowRecord?.variant || getVariantLabel(rowRecord?.variantes_obj || rowRecord?.variantes || {})
                );
                const variantCandidates = buildVariantLabelCandidates(nextProductName, nextVariantName);
                const rowVariantKey = normalizeText(rowRecord?.variantKey);

                const [branchesResponse, salesResponse, entriesResponse, productResponse] = await Promise.all([
                    getSucursalsAPI(),
                    getSalesBySellerIdAPI(user.id_vendedor),
                    getProductsEntryAmount(user.id_vendedor),
                    getProductByIdAPI(rowRecord._id)
                ]);

                if (cancelled) return;

                const branchMap = new Map<string, string>();
                (Array.isArray(branchesResponse) ? branchesResponse : []).forEach((branch: any) => {
                    branchMap.set(normalizeId(branch?._id), normalizeText(branch?.nombre || "Sucursal"));
                });

                const stockRows = (Array.isArray(productResponse?.sucursales) ? productResponse.sucursales : [])
                    .map((branch: any) => {
                        const branchId = normalizeId(branch?.id_sucursal);
                        const combinations = Array.isArray(branch?.combinaciones) ? branch.combinaciones : [];
                        const match = combinations.find((combination: any) => {
                            const combinationVariantKey = normalizeText(combination?.variantKey);
                            const combinationLabel = getVariantLabel(combination?.variantes || {});

                            return (
                                (rowVariantKey && combinationVariantKey && rowVariantKey === combinationVariantKey) ||
                                areVariantsEqual(combination?.variantes, normalizedVariant) ||
                                variantCandidates.has(normalizeLabel(combinationLabel)) ||
                                variantCandidates.has(normalizeLabel(`${nextProductName} - ${combinationLabel}`))
                            );
                        });

                        if (!match) return null;

                        return {
                            key: branchId || `${nextProductName}-${nextVariantName}`,
                            nombre_sucursal: branchMap.get(branchId) || "Sucursal",
                            stock: Number(match?.stock || 0)
                        };
                    })
                    .filter(Boolean);

                const salesRows = (Array.isArray(salesResponse) ? salesResponse : [])
                    .filter((sale: any) => {
                        if (normalizeId(sale?.id_producto) !== normalizeId(rowRecord?._id)) return false;

                        const saleVariantKey = normalizeText(sale?.variantKey);
                        if (rowVariantKey && saleVariantKey) {
                            return rowVariantKey === saleVariantKey;
                        }

                        if (areVariantsEqual(sale?.variantes, normalizedVariant)) return true;

                        const saleLabel = normalizeLabel(sale?.nombre_variante || "");
                        return variantCandidates.has(saleLabel);
                    })
                    .map((sale: any) => ({
                        key: normalizeId(sale?.id_venta) || `${normalizeId(sale?.id_producto)}-${sale?.fecha_pedido}`,
                        fecha: sale?.fecha_pedido,
                        producto: normalizeText(sale?.nombre_variante || `${nextProductName} - ${nextVariantName}`),
                        sucursal: branchMap.get(normalizeId(sale?.id_sucursal)) || "Sucursal",
                        precio: Number(sale?.precio_unitario || 0),
                        cantidad: Number(sale?.cantidad || 0),
                        subtotal: Number(sale?.precio_unitario || 0) * Number(sale?.cantidad || 0)
                    }));

                const entryRows = (Array.isArray(entriesResponse) ? entriesResponse : [])
                    .filter((entry: any) => {
                        if (normalizeId(entry?.producto) !== normalizeId(rowRecord?._id)) return false;
                        const entryLabel = normalizeLabel(entry?.nombre_variante || "");
                        return variantCandidates.has(entryLabel);
                    })
                    .map((entry: any) => ({
                        key: normalizeId(entry?._id) || `${normalizeId(entry?.producto)}-${entry?.fecha_ingreso}`,
                        fecha: entry?.fecha_ingreso,
                        sucursal: branchMap.get(normalizeId(entry?.sucursal)) || "Sucursal",
                        producto: normalizeText(entry?.nombre_variante || `${nextProductName} - ${nextVariantName}`),
                        cantidad: Number(entry?.cantidad_ingreso || 0)
                    }));

                setProductName(nextProductName);
                setVariantName(nextVariantName);
                setStockData(stockRows);
                setSalesData(salesRows);
                setEntryData(entryRows);
            } catch (error) {
                console.error("Error al obtener detalle de la variante:", error);
                message.error("No se pudo cargar el detalle de la variante.");
                if (cancelled) return;
                setStockData([]);
                setSalesData([]);
                setEntryData([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadVariantInfo();

        return () => {
            cancelled = true;
        };
    }, [visible, rowRecord, user?.id_vendedor, normalizedVariant]);

    const stockColumns = [
        {
            title: "Sucursal",
            key: "sucursal",
            dataIndex: "nombre_sucursal"
        },
        {
            title: "Stock",
            key: "stock",
            dataIndex: "stock"
        }
    ];

    const sellsColumns = [
        {
            title: "Fecha",
            key: "fecha",
            dataIndex: "fecha",
            render: (text: string) => (text ? moment.parseZone(text).format("DD/MM/YYYY") : "Sin fecha")
        },
        {
            title: "Producto",
            key: "producto",
            dataIndex: "producto"
        },
        {
            title: "Sucursal",
            key: "sucursal",
            dataIndex: "sucursal"
        },
        {
            title: "Precio unitario",
            key: "precio",
            dataIndex: "precio"
        },
        {
            title: "Cantidad",
            key: "cantidad",
            dataIndex: "cantidad"
        },
        {
            title: "Subtotal",
            key: "subtotal",
            dataIndex: "subtotal"
        }
    ];

    const entryColumns = [
        {
            title: "Fecha",
            key: "fecha",
            dataIndex: "fecha",
            render: (text: string) => (text ? moment.parseZone(text).format("DD/MM/YYYY") : "Sin fecha")
        },
        {
            title: "Sucursal",
            key: "sucursal",
            dataIndex: "sucursal"
        },
        {
            title: "Producto",
            key: "producto",
            dataIndex: "producto"
        },
        {
            title: "Cantidad",
            key: "cantidad",
            dataIndex: "cantidad"
        }
    ];

    return (
        <Modal
            title={
                "Detalles " +
                (variantName
                    ? `de la variante: ${productName} - ${variantName}`
                    : `del producto: ${productName || "Producto"}`)
            }
            open={visible}
            onCancel={onClose}
            footer={false}
            width={1000}
            destroyOnClose
        >
            <Card title="Stock por sucursal" bordered={false}>
                <Table
                    columns={stockColumns}
                    dataSource={stockData}
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    locale={{ emptyText: "No hay stock registrado para esta variante." }}
                />
            </Card>
            <Card title="Historial de ventas" bordered={false}>
                <Table
                    columns={sellsColumns}
                    dataSource={salesData}
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    locale={{ emptyText: "No hay ventas registradas para esta variante." }}
                />
            </Card>
            <Card title="Historial de ingresos" bordered={false}>
                <Table
                    columns={entryColumns}
                    dataSource={entryData}
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    locale={{ emptyText: "No hay ingresos registrados para esta variante." }}
                />
            </Card>
        </Modal>
    );
};

export default VariantInfoModal;
