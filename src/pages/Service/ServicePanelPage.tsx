import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloseOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LinkOutlined,
  PaperClipOutlined,
  PlusOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import ServiciosResumenTable from "./components/ServicesSummaryTable";
import { getServicesSummaryAPI } from "../../api/services";
import servicesIcon from "../../assets/services2.png";
import { UserContext } from "../../context/userContext";
import { normalizeRole } from "../../utils/role";
import AnnouncementAttachments, { type AnnouncementAttachment } from "../../components/AnnouncementAttachments";
import {
  acknowledgeServiceAnnouncementAPI,
  acceptServiceAnnouncementAPI,
  createServiceAnnouncementAPI,
  getAdminServiceAnnouncementsAPI,
  getMyServiceAnnouncementsAPI,
  publishServiceAnnouncementAPI,
} from "../../api/serviceAnnouncements";

import "./ServicePanelPage.css";

type PendingAttachmentFile = {
  uid: string;
  file: File;
  previewUrl?: string;
};

type Announcement = {
  _id: string;
  title: string;
  version: string;
  summary?: string;
  body: string;
  regulation?: string;
  policyText?: string;
  targetRoles: string[];
  requireAcceptance: boolean;
  sendPush: boolean;
  status: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  pendingRead?: boolean;
  pendingAcceptance?: boolean;
  isAcknowledged?: boolean;
  isAccepted?: boolean;
  attachments?: AnnouncementAttachment[];
};

const { Paragraph, Text } = Typography;
const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Operador", value: "operator" },
  { label: "Vendedor", value: "seller" },
];
const MAX_ATTACHMENT_FILES = 6;
const MAX_ATTACHMENT_FILE_SIZE = 200 * 1024 * 1024;
const tutorialAttachmentMimeTypes = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);
const allowedAttachmentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);
const attachmentAccept =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.mp4,.webm,.ogg,.mov";
const tutorialAttachmentAccept = ".pdf,.mp4,.webm,.ogg,.mov";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  });
};

const formatBytes = (value?: number) => {
  const size = Number(value || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isPreviewImageFile = (file: File) => file.type.startsWith("image/");

const getFileExtension = (fileName: string) => {
  const raw = String(fileName || "").split(".").pop() || "";
  return raw.toUpperCase();
};

const buildPendingAttachmentKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

const AudienceTags = ({ roles }: { roles?: string[] }) => (
  <Space size={[4, 4]} wrap>
    {(roles || []).map((role) => (
      <Tag key={role}>{role}</Tag>
    ))}
  </Space>
);

const ServiceAnnouncementCard = ({
  announcement,
  showAdminActions = false,
  onAcknowledge,
  onAccept,
  onPublish,
  busyId,
}: {
  announcement: Announcement;
  showAdminActions?: boolean;
  onAcknowledge?: (id: string) => Promise<void>;
  onAccept?: (id: string) => Promise<void>;
  onPublish?: (id: string) => Promise<void>;
  busyId?: string | null;
}) => {
  const isBusy = busyId === announcement._id;

  return (
    <Card
      key={announcement._id}
      size="small"
      style={{
        borderRadius: 14,
        borderColor: announcement.pendingAcceptance ? "#faad14" : "#e5e7eb",
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {announcement.title}
            </Text>
            <div style={{ marginTop: 6 }}>
              <Space wrap>
                <Tag color="blue">
                  {String(announcement.version || "").startsWith("tutorial-") ? "Tutorial" : `Version ${announcement.version}`}
                </Tag>
                <Tag color={announcement.status === "published" ? "green" : "default"}>
                  {announcement.status === "published" ? "Publicado" : "Borrador"}
                </Tag>
                {announcement.pendingAcceptance ? <Tag color="gold">Aceptacion pendiente</Tag> : null}
                {announcement.pendingRead && !announcement.pendingAcceptance ? (
                  <Tag color="processing">Nuevo</Tag>
                ) : null}
              </Space>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(announcement.publishedAt || announcement.updatedAt)}
              </Text>
            </div>
            <AudienceTags roles={announcement.targetRoles} />
          </div>
        </div>

        {announcement.summary ? (
          <Paragraph style={{ marginBottom: 0 }}>{announcement.summary}</Paragraph>
        ) : null}

        <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{announcement.body}</Paragraph>

        {announcement.regulation ? (
          <div>
            <Text strong>Reglamento</Text>
            <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {announcement.regulation}
            </Paragraph>
          </div>
        ) : null}

        {announcement.policyText ? (
          <div>
            <Text strong>Politicas</Text>
            <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {announcement.policyText}
            </Paragraph>
          </div>
        ) : null}

        <AnnouncementAttachments attachments={announcement.attachments} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          {showAdminActions && announcement.status !== "published" ? (
            <Button loading={isBusy} onClick={() => onPublish && void onPublish(announcement._id)}>
              Publicar
            </Button>
          ) : null}
          {!showAdminActions && announcement.pendingRead && !announcement.pendingAcceptance ? (
            <Button loading={isBusy} onClick={() => onAcknowledge && void onAcknowledge(announcement._id)}>
              Marcar leido
            </Button>
          ) : null}
          {!showAdminActions && announcement.pendingAcceptance ? (
            <Button type="primary" loading={isBusy} onClick={() => onAccept && void onAccept(announcement._id)}>
              Aceptar cambios
            </Button>
          ) : null}
        </div>
      </Space>
    </Card>
  );
};

export const ServicePanelPage: React.FC<{ isFactura: boolean }> = () => {
  const { user } = useContext(UserContext) || {};
  const role = normalizeRole(user?.role);
  const isAdmin = role === "admin";
  const isSeller = role === "seller";

  const [form] = Form.useForm();
  const [summary, setSummary] = useState<any | null>(null);
  const [sucursals, setSucursals] = useState<string[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyAnnouncementId, setBusyAnnouncementId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<Announcement[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<PendingAttachmentFile[]>([]);
  const [attachmentDragActive, setAttachmentDragActive] = useState(false);
  const [announcementMode, setAnnouncementMode] = useState<"announcement" | "tutorial">("announcement");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentFilesRef = useRef<PendingAttachmentFile[]>([]);
  const watchedLinkAttachments = Form.useWatch("linkAttachments", form) || [];

  const pendingCount = useMemo(
    () => announcements.filter((item) => item.pendingRead || item.pendingAcceptance).length,
    [announcements]
  );
  const pageTitle = isSeller ? "COMUNICADOS DEL SERVICIO" : "PANEL DE CONTROL DE SERVICIOS";
  const pageSubtitle = isSeller
    ? "Mensajes, reglamento, politicas y cambios publicados para tu cuenta."
    : "Comunicados, reglamento, politicas y aceptaciones del servicio.";

  useEffect(() => {
    attachmentFilesRef.current = attachmentFiles;
  }, [attachmentFiles]);

  useEffect(() => {
    return () => {
      attachmentFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const resetAttachmentFiles = () => {
    setAttachmentFiles((current) => {
      current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
    setAttachmentDragActive(false);
  };

  const handleAttachmentFilesAdd = (files: File[]) => {
    if (!files.length) return;

    setAttachmentFiles((current) => {
      const next = [...current];
      const duplicateKeys = new Set(current.map((item) => buildPendingAttachmentKey(item.file)));
      const acceptedMimeTypes =
        announcementMode === "tutorial" ? tutorialAttachmentMimeTypes : allowedAttachmentMimeTypes;
      let invalidTypeCount = 0;
      let invalidSizeCount = 0;
      let duplicateCount = 0;
      let skippedByLimit = 0;

      for (const file of files) {
        if (!acceptedMimeTypes.has(file.type)) {
          invalidTypeCount += 1;
          continue;
        }

        if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
          invalidSizeCount += 1;
          continue;
        }

        const fileKey = buildPendingAttachmentKey(file);
        if (duplicateKeys.has(fileKey)) {
          duplicateCount += 1;
          continue;
        }

        if (next.length >= MAX_ATTACHMENT_FILES) {
          skippedByLimit += 1;
          continue;
        }

        duplicateKeys.add(fileKey);
        next.push({
          uid: `${fileKey}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: isPreviewImageFile(file) ? URL.createObjectURL(file) : undefined,
        });
      }

      if (invalidTypeCount > 0) {
        if (announcementMode === "tutorial") {
          message.warning("Para tutoriales solo se permiten videos o PDF.");
        } else {
          message.warning("Solo se permiten PDF, Office, texto, CSV, imagenes o videos.");
        }
      }
      if (invalidSizeCount > 0) {
          message.warning("Cada archivo puede pesar hasta 200 MB.");
      }
      if (duplicateCount > 0) {
        message.info("Algunos archivos repetidos no se agregaron.");
      }
      if (skippedByLimit > 0) {
        message.warning(`Solo puedes adjuntar hasta ${MAX_ATTACHMENT_FILES} documentos.`);
      }

      return next;
    });
  };

  const handleRemoveAttachment = (uid: string) => {
    setAttachmentFiles((current) => {
      const fileToRemove = current.find((item) => item.uid === uid);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return current.filter((item) => item.uid !== uid);
    });
  };

  const loadSummary = async () => {
    if (!isAdmin) return;
    try {
      setLoadingSummary(true);
      const data = await getServicesSummaryAPI();
      const sucursalesFiltradas = Object.keys(data || {}).filter((s) => s !== "TOTAL");
      setSummary(data);
      setSucursals(sucursalesFiltradas);
    } catch (err) {
      console.error("Error al cargar resumen de servicios", err);
      message.error("No se pudo cargar el resumen de servicios");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadAnnouncements = async () => {
    if (!role) return;
    try {
      setLoadingAnnouncements(true);
      const [mineRes, adminRes] = await Promise.all([
        getMyServiceAnnouncementsAPI(),
        isAdmin ? getAdminServiceAnnouncementsAPI() : Promise.resolve(null),
      ]);

      if (mineRes?.success) {
        setAnnouncements(Array.isArray(mineRes.announcements) ? mineRes.announcements : []);
      }

      if (isAdmin && adminRes?.success) {
        setAdminAnnouncements(Array.isArray(adminRes.announcements) ? adminRes.announcements : []);
      } else if (!isAdmin) {
        setAdminAnnouncements([]);
      }
    } catch (error) {
      console.error("Error cargando comunicados:", error);
      message.error("No se pudieron cargar los comunicados del servicio");
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    void loadSummary();
    void loadAnnouncements();
  }, [isAdmin, role]);

  const handleCreate = async (publishNow = false) => {
    try {
      const values = await form.validateFields();
      const isTutorial = announcementMode === "tutorial";
      if (isTutorial && attachmentFiles.length === 0) {
        message.warning("Sube al menos un video o PDF para el tutorial.");
        return;
      }
      setSubmitting(true);
      const res = await createServiceAnnouncementAPI({
        ...values,
        version: isTutorial ? `tutorial-${Date.now()}` : values.version,
        summary: isTutorial ? values.body : values.summary,
        body: isTutorial ? String(values.body || values.title || "") : values.body,
        regulation: isTutorial ? "" : values.regulation,
        policyText: isTutorial ? "" : values.policyText,
        targetRoles: isTutorial ? ["seller"] : values.targetRoles,
        requireAcceptance: isTutorial ? false : values.requireAcceptance,
        sendPush: isTutorial ? true : values.sendPush,
        linkAttachments: Array.isArray(values.linkAttachments)
          ? (isTutorial ? [] : values.linkAttachments.filter((item: any) => String(item?.url || "").trim()))
          : [],
        attachmentFiles: attachmentFiles.map((item) => item.file),
        publishNow,
      });

      if (!res?.success) {
        throw new Error(res?.message || "No se pudo guardar el comunicado");
      }

      message.success(
        publishNow
          ? isTutorial
            ? "Tutorial publicado"
            : "Comunicado publicado"
          : isTutorial
            ? "Tutorial guardado como borrador"
            : "Comunicado guardado como borrador"
      );
      form.resetFields();
      form.setFieldsValue({
        targetRoles: ["seller"],
        requireAcceptance: isTutorial ? false : true,
        sendPush: true,
        linkAttachments: [],
      });
      resetAttachmentFiles();
      await loadAnnouncements();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || "No se pudo guardar el comunicado");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setBusyAnnouncementId(id);
      const res = await publishServiceAnnouncementAPI(id);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo publicar");
      }
      message.success("Comunicado publicado");
      await loadAnnouncements();
    } catch (error: any) {
      message.error(error?.message || "No se pudo publicar el comunicado");
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      setBusyAnnouncementId(id);
      const res = await acknowledgeServiceAnnouncementAPI(id);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo marcar como leido");
      }
      message.success("Comunicado marcado como leido");
      await loadAnnouncements();
    } catch (error: any) {
      message.error(error?.message || "No se pudo marcar el comunicado");
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      setBusyAnnouncementId(id);
      const res = await acceptServiceAnnouncementAPI(id);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo registrar la aceptacion");
      }
      message.success("Politicas y cambios aceptados");
      await loadAnnouncements();
    } catch (error: any) {
      message.error(error?.message || "No se pudo aceptar el comunicado");
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  return (
    <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md mb-2">
        <img src={servicesIcon} alt="Servicios" className="w-16" />
        <div>
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">{pageTitle}</h1>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {pageSubtitle}
          </div>
        </div>
      </div>

      {pendingCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          message={`Tienes ${pendingCount} comunicado(s) del servicio pendiente(s)`}
          description="Revisa los cambios publicados y acepta las politicas cuando corresponda."
        />
      ) : null}

      {isAdmin ? (
        <Card
          title={
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span>{announcementMode === "tutorial" ? "Nuevo tutorial" : "Nuevo comunicado"}</span>
              <Segmented
                value={announcementMode}
                options={[
                  { label: "Anuncios", value: "announcement" },
                  { label: "Tutoriales", value: "tutorial" },
                ]}
                onChange={(value) => {
                  const nextMode = value as "announcement" | "tutorial";
                  setAnnouncementMode(nextMode);
                  form.resetFields();
                  form.setFieldsValue({
                    targetRoles: ["seller"],
                    requireAcceptance: nextMode === "tutorial" ? false : true,
                    sendPush: true,
                    linkAttachments: [],
                  });
                  resetAttachmentFiles();
                }}
              />
            </div>
          }
          style={{ borderRadius: 14 }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              targetRoles: ["seller"],
              requireAcceptance: true,
              sendPush: true,
              linkAttachments: [],
            }}
          >
            <Row gutter={16}>
              <Col xs={24} md={announcementMode === "tutorial" ? 24 : 12}>
                <Form.Item name="title" label="Titulo" rules={[{ required: true, message: "Ingresa un titulo" }]}>
                  <Input placeholder={announcementMode === "tutorial" ? "Ej. Como preparar una solicitud de salida" : "Ej. Actualizacion de reglas de entregas"} />
                </Form.Item>
              </Col>
              {announcementMode === "announcement" ? (
                <Col xs={24} md={12}>
                  <Form.Item name="version" label="Version" rules={[{ required: true, message: "Ingresa una version" }]}>
                    <Input placeholder="Ej. 2026.04.01" />
                  </Form.Item>
                </Col>
              ) : null}
            </Row>

            {announcementMode === "announcement" ? (
              <Form.Item name="summary" label="Resumen corto">
                <Input.TextArea rows={2} placeholder="Mensaje breve para card y push" />
              </Form.Item>
            ) : null}
            <Form.Item
              name="body"
              label={announcementMode === "tutorial" ? "Descripcion" : "Mensaje principal"}
              rules={announcementMode === "tutorial" ? [] : [{ required: true, message: "Ingresa el mensaje principal" }]}
            >
              <Input.TextArea
                rows={announcementMode === "tutorial" ? 3 : 4}
                placeholder={announcementMode === "tutorial" ? "Descripcion opcional del tutorial" : "Detalle de cambios o aviso principal"}
              />
            </Form.Item>
            {announcementMode === "announcement" ? (
              <>
                <Form.Item name="regulation" label="Reglamento">
                  <Input.TextArea rows={3} placeholder="Texto de reglamento o condiciones operativas" />
                </Form.Item>
                <Form.Item name="policyText" label="Politicas de uso">
                  <Input.TextArea rows={3} placeholder="Politicas que el usuario debe aceptar" />
                </Form.Item>
              </>
            ) : null}

            <div className="service-announcement-editor-section">
              <div className="service-announcement-editor-header">
                <div>
                  <div className="service-announcement-editor-title">
                    {announcementMode === "tutorial" ? "Video/PDF" : "Links y documentos"}
                  </div>
                  <div className="service-announcement-editor-subtitle">
                    {announcementMode === "tutorial"
                      ? "Sube el video o PDF del tutorial para que los usuarios puedan verlo desde el aviso."
                      : "Adjunta enlaces externos o documentos en S3 para abrirlos o descargarlos desde el comunicado."}
                  </div>
                </div>
                {announcementMode === "tutorial" ? (
                  <Text type="secondary">{attachmentFiles.length} archivo(s)</Text>
                ) : (
                <Text type="secondary">
                  {watchedLinkAttachments.length} link(s) · {attachmentFiles.length} documento(s)
                </Text>
                )}
              </div>

              {announcementMode === "announcement" ? (
              <Form.List name="linkAttachments">
                {(fields, { add, remove }) => (
                  <div className="service-announcement-link-list">
                    {fields.map((field) => (
                      <div className="service-announcement-link-card" key={field.key}>
                        <div className="service-announcement-link-icon">
                          <LinkOutlined />
                        </div>
                        <div className="service-announcement-link-fields">
                          <Form.Item
                            {...field}
                            name={[field.name, "title"]}
                            label="Etiqueta"
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="Ej. Reglamento completo" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, "url"]}
                            label="URL"
                            style={{ marginBottom: 0 }}
                            rules={[
                              { required: true, message: "Ingresa una URL" },
                              { type: "url", message: "Ingresa una URL valida" },
                            ]}
                          >
                            <Input placeholder="https://..." />
                          </Form.Item>
                        </div>
                        <Button type="text" danger icon={<CloseOutlined />} onClick={() => remove(field.name)} />
                      </div>
                    ))}

                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ title: "", url: "" })}>
                      Añadir link
                    </Button>
                  </div>
                )}
              </Form.List>
              ) : null}

              <input
                ref={attachmentInputRef}
                type="file"
                accept={announcementMode === "tutorial" ? tutorialAttachmentAccept : attachmentAccept}
                multiple
                style={{ display: "none" }}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  handleAttachmentFilesAdd(files);
                  event.target.value = "";
                }}
              />

              <div
                className={`service-announcement-upload-zone ${
                  attachmentDragActive ? "service-announcement-upload-zone-active" : ""
                }`}
                onClick={() => attachmentInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAttachmentDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAttachmentDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.currentTarget === event.target) {
                    setAttachmentDragActive(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAttachmentDragActive(false);
                  handleAttachmentFilesAdd(Array.from(event.dataTransfer.files || []));
                }}
              >
                <div className="service-announcement-upload-zone-copy">
                  <div className="service-announcement-upload-zone-icon">
                    <PaperClipOutlined />
                  </div>
                  <div>
                    <div className="service-announcement-upload-zone-title">
                      {announcementMode === "tutorial"
                        ? "Arrastra un video/PDF aqui o haz clic para seleccionarlo"
                        : "Arrastra documentos aqui o haz clic para seleccionarlos"}
                    </div>
                    <div className="service-announcement-upload-zone-subtitle">
                      {announcementMode === "tutorial"
                        ? `Videos o PDF. Maximo ${MAX_ATTACHMENT_FILES} archivos de 200 MB.`
                        : `PDF, Word, Excel, PowerPoint, TXT, CSV, imagenes o videos. Maximo ${MAX_ATTACHMENT_FILES} archivos de 200 MB.`}
                    </div>
                  </div>
                </div>
              </div>

              {attachmentFiles.length ? (
                <div className="service-announcement-files-grid">
                  {attachmentFiles.map((item) => (
                    <div className="service-announcement-file-card" key={item.uid}>
                      <div
                        className={`service-announcement-file-thumb ${
                          item.previewUrl ? "service-announcement-file-thumb-image" : ""
                        }`}
                      >
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt={item.file.name} />
                        ) : String(item.file.type || "").includes("pdf") ? (
                          <FilePdfOutlined style={{ fontSize: 24 }} />
                        ) : String(item.file.type || "").includes("word") ? (
                          <FileTextOutlined style={{ fontSize: 24 }} />
                        ) : String(item.file.type || "").startsWith("image/") ? (
                          <FileImageOutlined style={{ fontSize: 24 }} />
                        ) : String(item.file.type || "").startsWith("video/") ? (
                          <VideoCameraOutlined style={{ fontSize: 24 }} />
                        ) : (
                          <span>{getFileExtension(item.file.name) || "FILE"}</span>
                        )}
                      </div>

                      <div className="service-announcement-file-copy">
                        <Typography.Text strong ellipsis={{ tooltip: item.file.name }}>
                          {item.file.name}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {getFileExtension(item.file.name) || "Archivo"} · {formatBytes(item.file.size)}
                        </Typography.Text>
                        <Tag bordered={false} color="default" style={{ width: "fit-content" }}>
                          Pendiente de subir
                        </Tag>
                      </div>

                      <Button
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        className="service-announcement-file-remove"
                        onClick={() => handleRemoveAttachment(item.uid)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {announcementMode === "announcement" ? (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="targetRoles" label="Dirigido a" rules={[{ required: true, message: "Selecciona al menos un rol" }]}>
                    <Select mode="multiple" options={roleOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="requireAcceptance" label="Requiere aceptacion" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="sendPush" label="Enviar push" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <Button loading={submitting} onClick={() => void handleCreate(false)}>
                {announcementMode === "tutorial" ? "Guardar tutorial" : "Guardar borrador"}
              </Button>
              <Button type="primary" loading={submitting} onClick={() => void handleCreate(true)}>
                {announcementMode === "tutorial" ? "Publicar tutorial" : "Publicar ahora"}
              </Button>
            </div>
          </Form>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card title="Resumen administrativo" style={{ borderRadius: 14 }}>
          {loadingSummary ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : summary && sucursals.length ? (
            <ServiciosResumenTable summary={summary} allSucursals={sucursals} />
          ) : (
            <Empty description="No se pudo cargar el resumen de servicios" />
          )}
        </Card>
      ) : null}

      {isAdmin ? (
        <Card title="Comunicados creados" style={{ borderRadius: 14 }}>
          {loadingAnnouncements ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : adminAnnouncements.length ? (
            <List
              grid={{ gutter: 16, xs: 1, lg: 2 }}
              dataSource={adminAnnouncements}
              renderItem={(item) => (
                <List.Item>
                  <ServiceAnnouncementCard
                    announcement={item}
                    showAdminActions
                    onPublish={handlePublish}
                    busyId={busyAnnouncementId}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="Aun no hay comunicados creados" />
          )}
        </Card>
      ) : null}

      <Card title="Comunicados para ti" style={{ borderRadius: 14 }}>
        {loadingAnnouncements ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : announcements.length ? (
          <List
            grid={{ gutter: 16, xs: 1, lg: 2 }}
            dataSource={announcements}
            renderItem={(item) => (
              <List.Item>
                <ServiceAnnouncementCard
                  announcement={item}
                  onAcknowledge={handleAcknowledge}
                  onAccept={handleAccept}
                  busyId={busyAnnouncementId}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No hay comunicados publicados para este rol" />
        )}
      </Card>
    </div>
  );
};

export default ServicePanelPage;
