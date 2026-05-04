import {
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LinkOutlined,
  PaperClipOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Space, Tag, Typography } from "antd";

import "./AnnouncementAttachments.css";

export type AnnouncementAttachment = {
  kind: "link" | "file";
  title?: string;
  url: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  extension?: string;
  s3Key?: string;
};

const formatBytes = (value?: number) => {
  const size = Number(value || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getHostnameLabel = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./, "");
  } catch (_error) {
    return value;
  }
};

const isImageAttachment = (attachment: AnnouncementAttachment) =>
  attachment.kind === "file" && String(attachment.contentType || "").startsWith("image/");

const isVideoAttachment = (attachment: AnnouncementAttachment) =>
  attachment.kind === "file" && String(attachment.contentType || "").startsWith("video/");

const getAttachmentIcon = (attachment: AnnouncementAttachment) => {
  if (attachment.kind === "link") return <LinkOutlined />;
  if (isImageAttachment(attachment)) return <FileImageOutlined />;
  if (isVideoAttachment(attachment)) return <VideoCameraOutlined />;
  if (String(attachment.contentType || "").includes("pdf")) return <FilePdfOutlined />;
  if (String(attachment.contentType || "").includes("word")) return <FileTextOutlined />;
  return <PaperClipOutlined />;
};

const getAttachmentAccent = (attachment: AnnouncementAttachment) => {
  if (attachment.kind === "link") return "announcement-attachment-thumb-link";
  if (isImageAttachment(attachment)) return "announcement-attachment-thumb-image";
  if (isVideoAttachment(attachment)) return "announcement-attachment-thumb-video";
  if (String(attachment.contentType || "").includes("pdf")) return "announcement-attachment-thumb-pdf";
  return "announcement-attachment-thumb-file";
};

const getAttachmentTitle = (attachment: AnnouncementAttachment) =>
  attachment.title || attachment.fileName || getHostnameLabel(attachment.url) || "Adjunto";

const AnnouncementAttachments = ({ attachments = [] }: { attachments?: AnnouncementAttachment[] }) => {
  if (!attachments.length) return null;

  return (
    <div className="announcement-attachments-section">
      <div className="announcement-attachments-header">
        <Typography.Text strong>Adjuntos</Typography.Text>
        <Typography.Text type="secondary">{attachments.length} elemento(s)</Typography.Text>
      </div>

      <div className="announcement-attachments-grid">
        {attachments.map((attachment, index) => {
          const title = getAttachmentTitle(attachment);
          const subtitle =
            attachment.kind === "link"
              ? getHostnameLabel(attachment.url)
              : [attachment.extension?.toUpperCase(), formatBytes(attachment.size)].filter(Boolean).join(" · ");

          return (
            <div className="announcement-attachment-card" key={`${attachment.kind}-${attachment.url}-${index}`}>
              <div className={`announcement-attachment-thumb ${getAttachmentAccent(attachment)}`}>
                {isVideoAttachment(attachment) ? (
                  <video
                    src={attachment.url}
                    className="announcement-attachment-video"
                    controls
                    preload="metadata"
                  />
                ) : isImageAttachment(attachment) ? (
                  <img
                    src={attachment.url}
                    alt={title}
                    className="announcement-attachment-image"
                  />
                ) : (
                  <span className="announcement-attachment-icon">{getAttachmentIcon(attachment)}</span>
                )}
              </div>

              <div className="announcement-attachment-content">
                <div className="announcement-attachment-copy">
                  <Typography.Text strong ellipsis={{ tooltip: title }}>
                    {title}
                  </Typography.Text>
                  {subtitle ? (
                    <Typography.Text type="secondary" ellipsis={{ tooltip: subtitle }}>
                      {subtitle}
                    </Typography.Text>
                  ) : null}
                </div>

                <Space size={[6, 6]} wrap>
                  <Tag bordered={false} color={attachment.kind === "link" ? "blue" : "default"}>
                    {attachment.kind === "link" ? "Link" : "Documento"}
                  </Tag>
                  {isImageAttachment(attachment) ? (
                    <Tag bordered={false} color="green">
                      Vista previa
                    </Tag>
                  ) : null}
                  {isVideoAttachment(attachment) ? (
                    <Tag bordered={false} color="purple">
                      Video
                    </Tag>
                  ) : null}
                </Space>

                <div className="announcement-attachment-actions">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </Button>
                  {attachment.kind === "file" ? (
                    <Button
                      size="small"
                      type="text"
                      icon={<DownloadOutlined />}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      Descargar
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementAttachments;
