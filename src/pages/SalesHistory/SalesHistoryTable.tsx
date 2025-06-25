import { useState, useEffect } from "react";
import { Table, DatePicker, message, Tag, Modal } from "antd";
import dayjs from "dayjs";
import { getSalesHistoryAPI } from "../../api/shipping"; // si está ahí
import { getShippingByIdAPI } from "../../api/shipping";
import EmptySalesTable from "../Sales/EmptySalesTable.tsx"; // asegúrate de importar

const SalesHistoryTable = () => {
    const [sales, setSales] = useState([]);
    const [totales, setTotales] = useState({ efectivo: 0, qr: 0 });
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [loading, setLoading] = useState(false);

    const sucursalId = localStorage.getItem("sucursalId");
    const [selectedSale, setSelectedSale] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalProducts, setModalProducts] = useState<any[]>([]);

    const handleRowClick = async (record: any) => {
        if (record.isSummary || !record._id) return;

        try {
            const res = await getShippingByIdAPI(record._id);
            if (res) {
                const ventasNormales = (res.venta || []).map((v: any) => ({
                    ...v,
                    key: v._id,
                    producto: v.nombre_variante || v.nombre_producto || v.producto || "Sin nombre",
                    esTemporal: v.producto?.esTemporal || false,
                }));

                const temporales = (res.productos_temporales || []).map((p: any, idx: number) => ({
                    ...p,
                    key: `temp-${idx}`,
                    producto: p.nombre_variante || p.nombre_producto || "Producto Temporal",
                    esTemporal: true,
                    utilidad: p.utilidad || 0,
                }));

                setModalProducts([...ventasNormales, ...temporales]);
                setSelectedSale(res);
                setIsModalOpen(true);
            }
        } catch (err) {
            console.error("Error cargando detalle del pedido:", err);
            message.error("Error al obtener los detalles del pedido");
        }
    };
    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await getSalesHistoryAPI(selectedDate?.toISOString(), sucursalId);
            if (res.success) {
                setSales(res.resumen);
                setTotales(res.totales);
            }
        } catch {
            message.error("Error al obtener el historial de ventas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, [selectedDate]);
    const getGroupedData = () => {
        if (selectedDate) return sales;

        const grouped: Record<string, any[]> = {};
        sales.forEach(item => {
            const fecha = dayjs(item.fecha).format("DD/MM/YYYY");
            if (!grouped[fecha]) grouped[fecha] = [];
            grouped[fecha].push(item);
        });

        const result: any[] = [];
        for (const fecha in grouped) {
            const group = grouped[fecha];
            const totalEfectivo = group.reduce((acc, curr) => acc + curr.subtotal_efectivo, 0);
            const totalQR = group.reduce((acc, curr) => acc + curr.subtotal_qr, 0);

            result.push({
                isSummary: true,
                fecha,
                tipo_de_pago: "Totales del día",
                monto_total: 0,
                subtotal_efectivo: totalEfectivo,
                subtotal_qr: totalQR,
            });

            result.push(...group);
        }

        return result;
    };

    const columns = [
        {
            title: "Fecha",
            dataIndex: "fecha",
            render: (val, record) => {
                if (record.isSummary) {
                    return (
                        <span className="italic text-gray-600">{record.fecha}</span>
                    );
                }
                return dayjs(val).format("DD/MM/YYYY");
            }
        },
        {
            title: "Hora",
            dataIndex: "hora",
        },
        {
            title: "Tipo de pago",
            dataIndex: "tipo_de_pago",
            align: "center",
            render: (val: string | number, record: any) => {
                if (record.isSummary) {
                    return (
                        <div className="text-gray-500 italic w-full text-center">
                            Totales del día
                        </div>
                    );
                }

                const valor = val?.toString().toLowerCase();
                const map: Record<string, string> = {
                    "1": "Transferencia o QR",
                    "2": "Efectivo",
                    "3": "Pagado al dueño",
                    "4": "Efectivo + QR",
                    "transferencia o qr": "Transferencia o QR",
                    "efectivo": "Efectivo",
                    "pagado al dueño": "Pagado al dueño",
                    "efectivo + qr": "Efectivo + QR",
                };

                const label = map[valor] || val;

                return (
                        <Tag
                            className="text-base font-semibold px-4 py-1"
                            style={{
                                borderRadius: "999px",
                                color: "#389e0d",
                                backgroundColor: "#f6ffed", // opcionalmente verde claro
                                border: "1px solid #b7eb8f",
                            }}
                        >
                            {label}
                        </Tag>
                );
            }
        },
        {
            title: "Monto total",
            dataIndex: "monto_total",
            render: (val, record) =>
                record.isSummary ? <span className="text-transparent">-</span> : `Bs. ${val.toFixed(2)}`
        },
        {
            title: "Subtotal efectivo",
            dataIndex: "subtotal_efectivo",
            render: (val) => `Bs. ${val.toFixed(2)}`,
        },
        {
            title: "Subtotal QR",
            dataIndex: "subtotal_qr",
            render: (val) => `Bs. ${val.toFixed(2)}`,
        },
    ];

    return (
        <>
            <div className="flex justify-center mb-6">
                <DatePicker
                    value={selectedDate}
                    onChange={(v) => setSelectedDate(v)}
                    allowClear
                    format="DD/MM/YYYY"
                    className="rounded-md px-3 py-2 shadow border border-gray-300"
                />
            </div>

            <div className="w-full max-w-4xl mx-auto border border-gray-300 rounded-xl px-6 py-4 bg-white mb-8 shadow-sm">
                <div className="flex flex-wrap justify-center items-center gap-8 text-lg font-semibold text-gray-700 text-center">
                    <div className="min-w-[180px]">
                        <span className="text-gray-500">Total efectivo:</span>{" "}
                        <span className="text-green-600 whitespace-nowrap">
                        Bs. {totales.efectivo.toFixed(2)}
                      </span>
                    </div>
                    <div className="min-w-[180px]">
                        <span className="text-gray-500">Total QR:</span>{" "}
                        <span className="text-blue-600 whitespace-nowrap">
                        Bs. {totales.qr.toFixed(2)}
                      </span>
                    </div>
                </div>
            </div>


            <Table
                columns={columns}
                dataSource={getGroupedData()}
                rowKey={(r) => r._id || `${r.fecha}-${r.hora}`}
                rowClassName={(record) =>
                    record.isSummary ? "bg-gray-50 text-center text-sm !align-middle" : "hover:bg-gray-100"
                }
                pagination={{ pageSize: 10 }}
                scroll={{ x: "max-content" }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
            />
            <Modal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                title="Detalle de la Venta"
                width={1000}
            >
                <EmptySalesTable
                    products={modalProducts}
                    onDeleteProduct={undefined}
                    onUpdateTotalAmount={() => {}} // puedes ignorar este callback
                    handleValueChange={() => {}}
                    sellers={[]} // no necesitas vendedores aquí
                    isAdmin={true}
                    readonly={true}
                />
            </Modal>
        </>
    );
};

export default SalesHistoryTable;
