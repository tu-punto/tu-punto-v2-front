import { useEffect, useState } from "react";
import { Button, Modal, Table, Tag, message } from "antd";
import {
    approveStockWithdrawalRequestAPI,
    getStockWithdrawalRequestsAPI,
    rejectStockWithdrawalRequestAPI
} from "../../api/stockWithdrawal";

type Props = {
    branchId?: string;
    open: boolean;
    onClose: () => void;
    onApproved: () => void;
    onCountChange?: (count: number) => void;
};

const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("es-BO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const getSellerLabel = (request: any) => {
    const seller = request?.seller;
    if (!seller) return "Vendedor";
    const brand = seller?.marca ? `${seller.marca} - ` : "";
    return `${brand}${seller?.nombre || ""} ${seller?.apellido || ""}`.trim() || "Vendedor";
};

const StockWithdrawalRequestsPanel = ({ branchId, open, onClose, onApproved, onCountChange }: Props) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string>("");

    const fetchRequests = async () => {
        if (!branchId) {
            setRequests([]);
            onCountChange?.(0);
            return;
        }
        setLoading(true);
        const res = await getStockWithdrawalRequestsAPI({ branchId, status: "pending" });
        setLoading(false);
        if (res?.success === false) {
            message.error(res?.message || "No se pudieron cargar las solicitudes de salida.");
            return;
        }
        const nextRows = Array.isArray(res) ? res : Array.isArray(res?.rows) ? res.rows : [];
        setRequests(nextRows);
        onCountChange?.(nextRows.length);
    };

    useEffect(() => {
        fetchRequests();
    }, [branchId]);

    const handleApprove = (request: any) => {
        Modal.confirm({
            title: "Aprobar salida de productos",
            content: "Se descontaran las cantidades solicitadas del stock y se registrara el movimiento en historial.",
            okText: "Aprobar salida",
            cancelText: "Cancelar",
            onOk: async () => {
                setProcessingId(String(request._id));
                const res = await approveStockWithdrawalRequestAPI(String(request._id));
                setProcessingId("");
                if (res?.success === false) {
                    message.error(res?.message || "No se pudo aprobar la solicitud.");
                    return;
                }
                message.success("Salida aprobada y stock actualizado.");
                await fetchRequests();
                onApproved();
            }
        });
    };

    const handleReject = async (request: any) => {
        setProcessingId(String(request._id));
        const res = await rejectStockWithdrawalRequestAPI(String(request._id));
        setProcessingId("");
        if (res?.success === false) {
            message.error(res?.message || "No se pudo rechazar la solicitud.");
            return;
        }
        message.success("Solicitud rechazada.");
        await fetchRequests();
    };

    const columns = [
        {
            title: "Vendedor",
            key: "seller",
            render: (_: any, record: any) => <strong>{getSellerLabel(record)}</strong>
        },
        {
            title: "Productos solicitados",
            key: "items",
            render: (_: any, record: any) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(record.items || []).map((item: any, index: number) => (
                        <span key={`${item.product}-${item.variantKey || index}`}>
                            {item.productName}
                            {item.variantLabel ? ` - ${item.variantLabel}` : ""}: <strong>{item.quantity}</strong>
                        </span>
                    ))}
                </div>
            )
        },
        {
            title: "Fecha",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 160,
            render: formatDate
        },
        {
            title: "Estado",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: () => <Tag color="gold">Pendiente</Tag>
        },
        {
            title: "Acciones",
            key: "actions",
            width: 220,
            render: (_: any, record: any) => (
                <div style={{ display: "flex", gap: 8 }}>
                    <Button
                        type="primary"
                        loading={processingId === String(record._id)}
                        onClick={() => handleApprove(record)}
                    >
                        Dar visto bueno
                    </Button>
                    <Button danger disabled={!!processingId} onClick={() => handleReject(record)}>
                        Rechazar
                    </Button>
                </div>
            )
        }
    ];

    return (
        <Modal
            open={open}
            title="Solicitudes de salida pendientes"
            onCancel={onClose}
            width={1100}
            footer={[
                <Button key="close" onClick={onClose}>
                    Cerrar
                </Button>
            ]}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div>
                    <div style={{ color: "#666", fontSize: 13 }}>
                        Al aprobar una solicitud se descuenta el stock y se registra el historial.
                    </div>
                </div>
                <Button onClick={fetchRequests} loading={loading}>
                    Actualizar
                </Button>
            </div>
            <Table
                columns={columns as any}
                dataSource={requests}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 5 }}
                locale={{ emptyText: "No hay solicitudes pendientes." }}
            />
        </Modal>
    );
};

export default StockWithdrawalRequestsPanel;
