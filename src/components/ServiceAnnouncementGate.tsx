import { Button, Modal, Space, Tag, Typography, message } from "antd";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { normalizeRole } from "../utils/role";
import AnnouncementAttachments, { type AnnouncementAttachment } from "./AnnouncementAttachments";
import {
  acceptServiceAnnouncementAPI,
  getPendingServiceAnnouncementAPI,
} from "../api/serviceAnnouncements";

type Announcement = {
  _id: string;
  title: string;
  version: string;
  summary?: string;
  body: string;
  regulation?: string;
  policyText?: string;
  attachments?: AnnouncementAttachment[];
};

const { Paragraph, Text } = Typography;

const ServiceAnnouncementGate = () => {
  const { user, loading } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !role) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await getPendingServiceAnnouncementAPI();
        if (!cancelled && res?.success) {
          setAnnouncement(res.announcement || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudo cargar el comunicado pendiente:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, role]);

  if (!role || !announcement?._id) return null;

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const res = await acceptServiceAnnouncementAPI(announcement._id);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo registrar la aceptacion");
      }
      message.success("Cambios y politicas aceptados");
      setAnnouncement(null);
    } catch (error: any) {
      message.error(error?.message || "No se pudo aceptar el comunicado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToAnnouncements = () => {
    setAnnouncement(null);
    navigate("/servicesPage");
  };

  return (
    <Modal
      open
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width={720}
      title="Actualizacion del servicio pendiente"
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>
            {announcement.title}
          </Text>
          <div>
            <Tag color="blue" style={{ marginTop: 8 }}>
              Version {announcement.version}
            </Tag>
          </div>
        </div>

        {announcement.summary ? (
          <Paragraph style={{ marginBottom: 0 }}>{announcement.summary}</Paragraph>
        ) : null}

        <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{announcement.body}</Paragraph>

        {announcement.regulation ? (
          <div>
            <Text strong>Reglamento</Text>
            <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
              {announcement.regulation}
            </Paragraph>
          </div>
        ) : null}

        {announcement.policyText ? (
          <div>
            <Text strong>Politicas</Text>
            <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
              {announcement.policyText}
            </Paragraph>
          </div>
        ) : null}

        <AnnouncementAttachments attachments={announcement.attachments} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button onClick={handleGoToAnnouncements}>Ir a los comunicados</Button>
          <Button type="primary" loading={submitting} onClick={() => void handleAccept()}>
            Aceptar cambios
          </Button>
        </div>
      </Space>
    </Modal>
  );
};

export default ServiceAnnouncementGate;
