import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import moment from "moment-timezone";

interface DeliveryDateMetadataProps {
  createdAt?: unknown;
  pickedUpAt?: unknown;
}

const TZ = "America/La_Paz";

const formatDeliveryDate = (value?: unknown) => {
  if (!value) return null;

  const date = moment.tz(value as moment.MomentInput, TZ);
  return date.isValid() ? date.format("DD/MM/YYYY · HH:mm") : null;
};

const DeliveryDateMetadata = ({ createdAt, pickedUpAt }: DeliveryDateMetadataProps) => {
  const formattedCreatedAt = formatDeliveryDate(createdAt);
  const formattedPickedUpAt = formatDeliveryDate(pickedUpAt);

  if (!formattedCreatedAt && !formattedPickedUpAt) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 20px",
        alignItems: "center",
        margin: "0 0 12px",
        padding: "8px 12px",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        background: "#fafafa",
        color: "#6b7280",
        fontSize: 13,
      }}
    >
      {formattedCreatedAt && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CalendarOutlined aria-hidden />
          <span>Creada: {formattedCreatedAt}</span>
        </span>
      )}
      {formattedPickedUpAt && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ClockCircleOutlined aria-hidden />
          <span>Recogida: {formattedPickedUpAt}</span>
        </span>
      )}
    </div>
  );
};

export default DeliveryDateMetadata;
