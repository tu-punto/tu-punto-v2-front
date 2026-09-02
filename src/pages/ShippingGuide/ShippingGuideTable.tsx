import { useEffect, useMemo, useState } from "react";
import { getShippingByBranchAPI, getShippingGuidesAPI, getShippingGuidesBySellerAPI, markAsDelivered, updateShippingGuideObservationsAPI } from "../../api/shippingGuide";
import { Button, Card, Empty, Input, message, Modal, Select, Spin, Table, Tabs, Tooltip, Typography } from "antd";
import { CheckCircleOutlined, FileImageOutlined, LinkOutlined, MessageOutlined } from '@ant-design/icons';
import { getSignedURL } from "../../helpers/s3Helper";
import moment from "moment-timezone";

type PickupFilter = "all" | "picked_up" | "pending";

type GuideAttachment = {
    key: string;
    name: string;
    url: string;
    type: "image" | "pdf" | "other";
};

const getAttachmentName = (key: string) => {
    const raw = String(key || "").split("/").pop() || key;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
};

const getAttachmentType = (key: string): GuideAttachment["type"] => {
    const ext = String(key || "").split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
};

const ShippingGuideTable = (
    { refreshKey, user, isFilterBySeller, isFilterByBranch, search_id }:
        { refreshKey: number, user: any, isFilterBySeller?: boolean, isFilterByBranch?: boolean, search_id: string }) => {
    const [guidesList, setGuidesList] = useState<any[]>([]);
    const [imageUrl, setImageUrl] = useState<string | null>();
    const [imageDesc, setImageDesc] = useState<string | null>();
    const [isImageVisible, setIsImageVisible] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [guideAttachments, setGuideAttachments] = useState<GuideAttachment[]>([]);
    const [activePreviewTab, setActivePreviewTab] = useState("photo");
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
    const [pickupFilter, setPickupFilter] = useState<PickupFilter>("all");
    const [observationsModalOpen, setObservationsModalOpen] = useState(false);
    const [observationsSaving, setObservationsSaving] = useState(false);
    const [observationsValue, setObservationsValue] = useState("");
    const [observationsTarget, setObservationsTarget] = useState<any | null>(null);

    const normalizedRole = String(user?.role || "").toLowerCase();
    const isAdmin = normalizedRole === "admin";
    const isOperator = normalizedRole === "operator";
    const isSuperadmin = normalizedRole === "superadmin";

    useEffect(() => {
        if (!isFilterBySeller && !isFilterByBranch) {
            fetchAllGuides();
        } else if (isFilterBySeller) {
            fetchGuidesBySeller();
        } else if (isFilterByBranch) {
            fetchGuidesByBranch();
        }
    }, [refreshKey])

    const fetchAllGuides = async () => {
        try {
            const apiData = await getShippingGuidesAPI();
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guí­as de Enví­o: ", error)
            message.error("Error al cargar Guí­as de Enví­o")
        }
    }
    const fetchGuidesBySeller = async () => {
        try {
            const apiData = await getShippingGuidesBySellerAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guí­as de Enví­o por vendedor: ", error)
            message.error("Error al cargar Guí­as de Enví­o")
        }
    };

    const fetchGuidesByBranch = async () => {
        try {
            const apiData = await getShippingByBranchAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
            setPickupFilter("all")
        } catch (error) {
            console.error("Error al obtener Guí­as de Enví­o por vendedor: ", error)
            message.error("Error al cargar Guí­as de Enví­o")
        }
    }

    const filteredGuidesList = useMemo(() => {
        if (pickupFilter === "picked_up") {
            return guidesList.filter((guide: any) => guide.isRecogido);
        }
        if (pickupFilter === "pending") {
            return guidesList.filter((guide: any) => !guide.isRecogido);
        }
        return guidesList;
    }, [guidesList, pickupFilter]);

    const handleShowImage = async (record: any) => {
        const documentKeys = Array.isArray(record.lista_productos_keys) ? record.lista_productos_keys : [];

        if (!record.imagen_key && !documentKeys.length) {
            message.info("Esta guía no tiene archivos adjuntos");
            return;
        }

        setIsImageVisible(true);
        setPreviewLoading(true);
        setImageUrl(null);
        setImageDesc(record.descripcion);
        setGuideAttachments([]);
        setActivePreviewTab(record.imagen_key ? "photo" : "documents");

        try {
            const [image_url, docs] = await Promise.all([
                record.imagen_key ? getSignedURL(record.imagen_key) : Promise.resolve(null),
                Promise.all(
                    documentKeys.map(async (key: string) => ({
                        key,
                        name: getAttachmentName(key),
                        url: await getSignedURL(key),
                        type: getAttachmentType(key),
                    }))
                ),
            ]);

            setImageUrl(image_url);
            setGuideAttachments(docs);
        } catch (error) {
            console.error("Error al preparar la vista previa de la guía:", error);
            message.error("No se pudo cargar la vista previa de la guía");
        } finally {
            setPreviewLoading(false);
        }
    }

    const handleCheckShipping = async (record: any) => {
        if (record.isRecogido) {
            message.info("Esta guí­a ya fue marcada como recogida")
            return
        }
        try {
            const res = await markAsDelivered(record._id);
            if (res.success) {
                message.success("El estado de la guí­a se ha actualizado correctamente")
                setGuidesList((current: any[]) =>
                    current.map((item) =>
                        String(item._id) === String(record._id)
                            ? { ...item, isRecogido: true }
                            : item
                    )
                );
            } else {
                message.error("Error al actualizar el estado de la guí­a")
            }
        } catch (error) {
            console.error("Erorr al actualizar el estado entregado de Guí­a de Enví­o: ", error)
            message.error("Error al actualizar el estado de la guí­a")
        }
    }

    const handleOpenObservations = (record: any) => {
        setObservationsTarget(record);
        setObservationsValue(String(record?.observaciones || ""));
        setObservationsModalOpen(true);
    };

    const handleSaveObservations = async () => {
        if (!observationsTarget?._id) return;

        setObservationsSaving(true);
        try {
            const res = await updateShippingGuideObservationsAPI(String(observationsTarget._id), observationsValue);
            if (!res.success) {
                message.error(res.message || "No se pudieron guardar las observaciones");
                return;
            }

            message.success("Observaciones actualizadas");
            setGuidesList((current: any[]) =>
                current.map((item) =>
                    String(item._id) === String(observationsTarget._id)
                        ? { ...item, observaciones: observationsValue }
                        : item
                )
            );
            setObservationsModalOpen(false);
            setObservationsTarget(null);
        } catch (error) {
            console.error("Error al guardar observaciones de la guía:", error);
            message.error("No se pudieron guardar las observaciones");
        } finally {
            setObservationsSaving(false);
        }
    };

    const columns = [
        {
            title: '¿Recogido?',
            dataIndex: 'isRecogido',
            key: 'isRecogido',
            width: 100,
            render: (_: any, record: any) => {
                const color = record.isRecogido ? 'bg-green-500' : 'bg-red-500';
                return {
                    children: <div
                        className={`w-4 h-4 rounded-full ${color}`}
                    />,
                }
            }
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (_: any, record: any) => {
                const vendedor = record.vendedor
                return `${vendedor.nombre} ${vendedor.apellido}`
            }
        },
        {
            title: 'Fecha de creación',
            dataIndex: 'fecha_subida',
            key: 'fecha_subida',
            width: 180,
            render: (text: string) => moment.parseZone(text).format("DD/MM/YYYY"),
            sorter: (a: any, b: any) =>
                moment.parseZone(a.fecha_subida).valueOf() -
                moment.parseZone(b.fecha_subida).valueOf(),
            sortOrder,
            onHeaderCell: () => ({
                onClick: () => {
                    setSortOrder(prev => (prev === 'ascend' ? 'descend' : 'ascend'));
                },
            }),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            render: (_: any, record: any) => {
                if (record.descripcion == "undefined") {
                    return "Sin descripción"
                } else {
                    return record.descripcion
                }
            }
        },
        {
            title: 'Acciones',
            dataIndex: 'imagen_key',
            key: 'imagen_key',
            render: (_: any, record: any) => {
                return (
                    <>
                        {(record.imagen_key || (Array.isArray(record.lista_productos_keys) && record.lista_productos_keys.length > 0)) && (
                            <Tooltip title="Ver foto">
                                <Button
                                    size="small"
                                    icon={<FileImageOutlined />}
                                    onClick={() => { handleShowImage(record) }}
                                />
                            </Tooltip>
                        )}
                        {(isAdmin || isOperator || isSuperadmin) && (
                            <Tooltip title="Confirmar entrega">
                                <Button
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => { handleCheckShipping(record) }} />
                            </Tooltip>
                        )}
                        {(isAdmin || isOperator || isSuperadmin) && (
                            <Tooltip title="Observaciones">
                                <Button
                                    size="small"
                                    icon={<MessageOutlined />}
                                    onClick={() => { handleOpenObservations(record) }} />
                            </Tooltip>
                        )}
                    </>
                )
            }
        }
    ];

    return (
        <>
            {isFilterByBranch && (
                <div className="mb-4 flex justify-end">
                    <Select
                        value={pickupFilter}
                        onChange={(value: PickupFilter) => setPickupFilter(value)}
                        style={{ width: 180 }}
                        options={[
                            { value: "all", label: "Todos" },
                            { value: "picked_up", label: "Ya recogido" },
                            { value: "pending", label: "No recogido" },
                        ]}
                    />
                </div>
            )}

            <Table
                columns={columns}
                dataSource={filteredGuidesList}
                scroll={{ x: "max-content" }}
            />

            <Modal
                open={isImageVisible}
                onCancel={() => {
                    setIsImageVisible(false)
                    setImageUrl(null)
                    setImageDesc(null)
                    setGuideAttachments([])
                    setPreviewLoading(false)
                }}
                footer={null}
                width={920}
            >
                <Tabs
                    activeKey={activePreviewTab}
                    onChange={setActivePreviewTab}
                    items={[
                        {
                            key: "photo",
                            label: "Foto",
                            children: previewLoading ? (
                                <div className="py-8 flex justify-center"><Spin /></div>
                            ) : imageUrl ? (
                                <div>
                                    <img src={imageUrl} alt="Imagen" style={{ width: "100%", maxHeight: 520, objectFit: "contain" }} />
                                    <div className="py-4 text-gray-600">{imageDesc}</div>
                                </div>
                            ) : (
                                <Empty description="Esta guía no tiene foto" />
                            ),
                        },
                        {
                            key: "documents",
                            label: `Documentos (${guideAttachments.length})`,
                            children: previewLoading ? (
                                <div className="py-8 flex justify-center"><Spin /></div>
                            ) : guideAttachments.length ? (
                                <div className="space-y-4">
                                    {guideAttachments.map((attachment) => (
                                        <Card
                                            key={attachment.key}
                                            size="small"
                                            title={attachment.name}
                                            extra={
                                                <Button
                                                    icon={<LinkOutlined />}
                                                    onClick={() => window.open(attachment.url, "_blank", "noopener,noreferrer")}
                                                >
                                                    Abrir
                                                </Button>
                                            }
                                        >
                                            {attachment.type === "image" ? (
                                                <img src={attachment.url} alt={attachment.name} style={{ width: "100%", maxHeight: 420, objectFit: "contain" }} />
                                            ) : attachment.type === "pdf" ? (
                                                <iframe
                                                    src={attachment.url}
                                                    title={attachment.name}
                                                    style={{ width: "100%", height: 500, border: 0 }}
                                                />
                                            ) : (
                                                <Typography.Text type="secondary">
                                                    Vista previa no disponible para este formato. Usa Abrir para verlo.
                                                </Typography.Text>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Empty description="Esta guía no tiene documentos" />
                            ),
                        },
                    ]}
                />

            </Modal>

            <Modal
                title="Observaciones de la guía"
                open={observationsModalOpen}
                onCancel={() => {
                    setObservationsModalOpen(false);
                    setObservationsTarget(null);
                    setObservationsValue("");
                }}
                onOk={handleSaveObservations}
                okText="Guardar"
                cancelText="Cancelar"
                confirmLoading={observationsSaving}
            >
                <div className="space-y-3">
                    <div className="text-sm text-slate-600">
                        {observationsTarget ? `${observationsTarget.vendedor?.nombre || ""} ${observationsTarget.vendedor?.apellido || ""}`.trim() : ""}
                    </div>
                    <Input.TextArea
                        value={observationsValue}
                        onChange={(event) => setObservationsValue(event.target.value)}
                        placeholder="Escribe las observaciones..."
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        maxLength={1000}
                        showCount
                    />
                </div>
            </Modal>
        </>
    )
}

export default ShippingGuideTable;
