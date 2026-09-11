import { useEffect, useMemo, useState } from "react";
import { getShippingByBranchAPI, getShippingGuidesAPI, getShippingGuidesBySellerAPI, markAsDelivered, markAsRegistered, updateShippingGuideObservationsAPI } from "../../api/shippingGuide";
import { Button, Card, Empty, Input, message, Modal, Segmented, Spin, Table, Tooltip, Typography } from "antd";
import { CheckCircleOutlined, FileImageOutlined, LinkOutlined, MessageOutlined, SearchOutlined } from "@ant-design/icons";
import { getSignedURL } from "../../helpers/s3Helper";
import moment from "moment-timezone";

type PickupFilter = "all" | "picked_up" | "pending";
type RegistrationFilter = "all" | "registered" | "not_registered";
type PreviewKind = "guide" | "list" | null;
type GuideAttachment = { key: string; name: string; url: string; type: "image" | "pdf" | "other" };

const attachmentName = (key: string) => { try { return decodeURIComponent(String(key || "").split("/").pop() || key); } catch { return key; } };
const attachmentType = (key: string): GuideAttachment["type"] => {
    const ext = String(key || "").split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "") ? "image" : ext === "pdf" ? "pdf" : "other";
};
const hasProductList = (guide: any) => Array.isArray(guide.lista_productos_keys) && guide.lista_productos_keys.length > 0;
const StatusDot = ({ active }: { active: boolean }) => <div className={`w-4 h-4 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`} />;
const sellerName = (guide: any) => `${guide.vendedor?.nombre || ""} ${guide.vendedor?.apellido || ""}`.trim() || "Sin vendedor";

const ShippingGuideTable = ({ refreshKey, user, isFilterBySeller, isFilterByBranch, search_id }: { refreshKey: number; user: any; isFilterBySeller?: boolean; isFilterByBranch?: boolean; search_id?: string }) => {
    const [guidesList, setGuidesList] = useState<any[]>([]);
    const [preview, setPreview] = useState<{ kind: PreviewKind; imageUrl: string | null; description: string | null; attachments: GuideAttachment[] }>({ kind: null, imageUrl: null, description: null, attachments: [] });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState<"ascend" | "descend">("descend");
    const [pickupFilter, setPickupFilter] = useState<PickupFilter>("all");
    const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>("all");
    const [sellerSearch, setSellerSearch] = useState("");
    const [observationsTarget, setObservationsTarget] = useState<any | null>(null);
    const [observationsValue, setObservationsValue] = useState("");
    const [observationsSaving, setObservationsSaving] = useState(false);
    const isManager = ["admin", "operator", "superadmin"].includes(String(user?.role || "").toLowerCase());

    useEffect(() => {
        const load = async () => {
            try {
                const data = !isFilterBySeller && !isFilterByBranch ? await getShippingGuidesAPI() : isFilterBySeller ? await getShippingGuidesBySellerAPI(search_id || "") : await getShippingByBranchAPI(search_id || "");
                setGuidesList(Array.isArray(data) ? data.sort((a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()) : []);
            } catch (error) { console.error(error); message.error("Error al cargar guias de envio"); }
        };
        load();
    }, [refreshKey, isFilterBySeller, isFilterByBranch, search_id]);

    const filteredGuidesList = useMemo(() => guidesList.filter((guide) => {
        const pickupMatches = pickupFilter === "all" || (pickupFilter === "picked_up" && guide.isRecogido) || (pickupFilter === "pending" && !guide.isRecogido);
        const registeredMatches = registrationFilter === "all" || (registrationFilter === "registered" && guide.isRegistrado) || (registrationFilter === "not_registered" && !guide.isRegistrado);
        return pickupMatches && registeredMatches && (!sellerSearch.trim() || sellerName(guide).toLocaleLowerCase().includes(sellerSearch.trim().toLocaleLowerCase()));
    }), [guidesList, pickupFilter, registrationFilter, sellerSearch]);

    const closePreview = () => { setIsPreviewVisible(false); setPreview({ kind: null, imageUrl: null, description: null, attachments: [] }); };
    const showFiles = async (record: any, kind: Exclude<PreviewKind, null>) => {
        const keys = Array.isArray(record.lista_productos_keys) ? record.lista_productos_keys : [];
        if ((kind === "guide" && !record.imagen_key) || (kind === "list" && !keys.length)) { message.info(kind === "guide" ? "Esta guia no tiene archivo adjunto" : "Esta lista no tiene archivos adjuntos"); return; }
        setIsPreviewVisible(true); setPreviewLoading(true); setPreview({ kind, imageUrl: null, description: record.descripcion, attachments: [] });
        try {
            if (kind === "guide") setPreview({ kind, imageUrl: await getSignedURL(record.imagen_key), description: record.descripcion, attachments: [] });
            else setPreview({ kind, imageUrl: null, description: record.descripcion, attachments: await Promise.all(keys.map(async (key: string) => ({ key, name: attachmentName(key), url: await getSignedURL(key), type: attachmentType(key) }))) });
        } catch (error) { console.error(error); message.error("No se pudo cargar la vista previa"); } finally { setPreviewLoading(false); }
    };
    const markPickedUp = async (record: any) => {
        if (record.isRecogido) return;
        try {
            const result = await markAsDelivered(record._id);
            if (!result.success) { message.error("Error al actualizar el estado de la guia"); return; }
            setGuidesList((current) => current.map((item) => String(item._id) === String(record._id) ? { ...item, isRecogido: true } : item));
            message.success("El estado de la guia se actualizo correctamente");
        } catch (error) { console.error(error); message.error("Error al actualizar el estado de la guia"); }
    };
    const markRegistered = async (record: any) => {
        if (record.isRegistrado) return;
        try {
            const result = await markAsRegistered(record._id);
            if (!result.success) { message.error("Error al registrar la lista"); return; }
            setGuidesList((current) => current.map((item) => String(item._id) === String(record._id) ? { ...item, isRegistrado: true } : item));
            message.success("Lista registrada correctamente");
        } catch (error) { console.error(error); message.error("Error al registrar la lista"); }
    };
    const saveObservations = async () => {
        if (!observationsTarget?._id) return;
        setObservationsSaving(true);
        try {
            const result = await updateShippingGuideObservationsAPI(String(observationsTarget._id), observationsValue);
            if (!result.success) { message.error(result.message || "No se pudieron guardar las observaciones"); return; }
            setGuidesList((current) => current.map((item) => String(item._id) === String(observationsTarget._id) ? { ...item, observaciones: observationsValue } : item));
            setObservationsTarget(null); message.success("Observaciones actualizadas");
        } catch (error) { console.error(error); message.error("No se pudieron guardar las observaciones"); } finally { setObservationsSaving(false); }
    };
    const dateColumn = { title: isManager ? "Fecha de creacion y hora" : "Fecha de creacion", dataIndex: "fecha_subida", key: "fecha_subida", width: isManager ? 190 : 180, render: (value: string) => moment.parseZone(value).format(isManager ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"), sorter: (a: any, b: any) => moment.parseZone(a.fecha_subida).valueOf() - moment.parseZone(b.fecha_subida).valueOf(), sortOrder, onHeaderCell: () => ({ onClick: () => setSortOrder((current) => current === "ascend" ? "descend" : "ascend") }) };
    const pickupButton = (record: any, label: string) => <Tooltip title={record.isRecogido ? "Ya fue recogida" : label}><Button size="small" icon={<CheckCircleOutlined />} disabled={record.isRecogido} onClick={() => markPickedUp(record)} /></Tooltip>;
    const columns = isManager ? [dateColumn, { title: "Vendedor", key: "vendedor", render: (_: any, record: any) => sellerName(record) }, { title: "¿Recogido?", key: "picked", width: 115, render: (_: any, record: any) => <StatusDot active={Boolean(record.isRecogido)} /> }, { title: "Acciones de guia", key: "guide", width: 150, render: (_: any, record: any) => <div className="flex gap-1"><Tooltip title={record.imagen_key ? "Abrir guia" : "No hay guia adjunta"}><Button size="small" icon={<FileImageOutlined />} disabled={!record.imagen_key} onClick={() => showFiles(record, "guide")} /></Tooltip>{pickupButton(record, "Marcar guia como recogida")}</div> }, { title: "¿Registrado?", key: "registered", width: 125, render: (_: any, record: any) => <StatusDot active={Boolean(record.isRegistrado)} /> }, { title: "Acciones de lista", key: "list", width: 210, render: (_: any, record: any) => <div className="flex gap-1"><Tooltip title={hasProductList(record) ? "Abrir lista" : "No hay lista adjunta"}><Button size="small" icon={<FileImageOutlined />} disabled={!hasProductList(record)} onClick={() => showFiles(record, "list")} /></Tooltip>{pickupButton(record, "Marcar lista como recogida")}<Tooltip title={record.isRegistrado ? "Ya fue registrada" : "Marcar lista como registrada"}><Button size="small" icon={<CheckCircleOutlined />} disabled={record.isRegistrado} onClick={() => markRegistered(record)} /></Tooltip><Tooltip title="Comentario"><Button size="small" icon={<MessageOutlined />} onClick={() => { setObservationsTarget(record); setObservationsValue(String(record.observaciones || "")); }} /></Tooltip></div> }] : [{ title: "¿Recogido?", key: "picked", width: 100, render: (_: any, record: any) => <StatusDot active={Boolean(record.isRecogido)} /> }, { title: "Vendedor", key: "vendedor", render: (_: any, record: any) => sellerName(record) }, dateColumn, { title: "Descripcion", key: "description", render: (_: any, record: any) => record.descripcion === "undefined" ? "Sin descripcion" : record.descripcion }, { title: "Acciones", key: "actions", render: (_: any, record: any) => (record.imagen_key || hasProductList(record)) && <Tooltip title="Ver archivo"><Button size="small" icon={<FileImageOutlined />} onClick={() => showFiles(record, record.imagen_key ? "guide" : "list")} /></Tooltip> }];

    return <><>{isManager ? <div className="mb-4 flex flex-wrap items-center gap-3"><Input allowClear prefix={<SearchOutlined />} placeholder="Filtrar por nombre del vendedor" value={sellerSearch} onChange={(event) => setSellerSearch(event.target.value)} style={{ width: 260 }} /><Segmented value={pickupFilter} onChange={(value) => setPickupFilter(value as PickupFilter)} options={[{ value: "all", label: "Todos" }, { value: "picked_up", label: "Recogidos" }, { value: "pending", label: "Pendientes" }]} /><Segmented value={registrationFilter} onChange={(value) => setRegistrationFilter(value as RegistrationFilter)} options={[{ value: "all", label: "Todos" }, { value: "registered", label: "Registrados" }, { value: "not_registered", label: "Sin registrar" }]} /></div> : isFilterByBranch ? <div className="mb-4 flex justify-end"><Segmented value={pickupFilter} onChange={(value) => setPickupFilter(value as PickupFilter)} options={[{ value: "all", label: "Todos" }, { value: "picked_up", label: "Ya recogido" }, { value: "pending", label: "No recogido" }]} /></div> : null}</><Table rowKey="_id" columns={columns} dataSource={filteredGuidesList} scroll={{ x: "max-content" }} /><Modal open={isPreviewVisible} onCancel={closePreview} footer={null} width={920} title={preview.kind === "guide" ? "Guia" : "Lista de productos"}>{previewLoading ? <div className="py-8 flex justify-center"><Spin /></div> : preview.kind === "guide" ? preview.imageUrl ? <img src={preview.imageUrl} alt="Guia" style={{ width: "100%", maxHeight: 520, objectFit: "contain" }} /> : <Empty description="Esta guia no tiene archivo" /> : preview.attachments.length ? <div className="space-y-4">{preview.attachments.map((attachment) => <Card key={attachment.key} size="small" title={attachment.name} extra={<Button icon={<LinkOutlined />} onClick={() => window.open(attachment.url, "_blank", "noopener,noreferrer")}>Abrir</Button>}>{attachment.type === "image" ? <img src={attachment.url} alt={attachment.name} style={{ width: "100%", maxHeight: 420, objectFit: "contain" }} /> : attachment.type === "pdf" ? <iframe src={attachment.url} title={attachment.name} style={{ width: "100%", height: 500, border: 0 }} /> : <Typography.Text type="secondary">Vista previa no disponible para este formato. Usa Abrir para verlo.</Typography.Text>}</Card>)}</div> : <Empty description="Esta lista no tiene archivos" />}<div className="pt-4 text-gray-600">{preview.description && preview.description !== "undefined" ? preview.description : "Sin descripcion"}</div></Modal><Modal title="Observaciones de la guia" open={Boolean(observationsTarget)} onCancel={() => { setObservationsTarget(null); setObservationsValue(""); }} onOk={saveObservations} okText="Guardar" cancelText="Cancelar" confirmLoading={observationsSaving}><div className="space-y-3"><div className="text-sm text-slate-600">{observationsTarget ? sellerName(observationsTarget) : ""}</div><Input.TextArea value={observationsValue} onChange={(event) => setObservationsValue(event.target.value)} placeholder="Escribe las observaciones..." autoSize={{ minRows: 3, maxRows: 8 }} maxLength={1000} showCount /></div></Modal></>;
};

export default ShippingGuideTable;
