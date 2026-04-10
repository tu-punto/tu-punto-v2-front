import { Alert, Button, Card, Result, Space, Spin, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPublicTrackingAPI,
  getPushPublicConfigAPI,
  registerBuyerPushSubscriptionAPI,
} from "../../api/notification";
import { ensurePushSubscription, getExistingPushSubscription, pushIsSupported } from "../../utils/push";

type TrackingData = {
  shippingId: string;
  trackingCode: string;
  cliente: string;
  estado_pedido: string;
  lugar_entrega: string;
  hora_entrega_acordada?: string | null;
};

const { Title, Paragraph, Text } = Typography;

const formatDeliveryTime = (value?: string | null) => {
  if (!value) return "Sin horario definido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin horario definido";
  return date.toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  });
};

const TrackingPage = () => {
  const { code = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [pushConfig, setPushConfig] = useState<{ enabled?: boolean; publicKey?: string | null }>({});
  const [pushLinked, setPushLinked] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const syncExistingSubscription = useCallback(
    async (trackingCode: string, publicKey?: string | null) => {
      if (!trackingCode || !publicKey || !pushIsSupported() || Notification.permission !== "granted") return;
      try {
        const existing = await getExistingPushSubscription();
        if (!existing) {
          setPushLinked(false);
          return;
        }
        const res = await registerBuyerPushSubscriptionAPI(trackingCode, existing.toJSON());
        if (res?.success) {
          setPushLinked(true);
        }
      } catch (syncError) {
        console.error("No se pudo sincronizar push del comprador:", syncError);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      const [trackingRes, pushRes] = await Promise.all([
        getPublicTrackingAPI(code),
        getPushPublicConfigAPI(),
      ]);

      if (!active) return;

      if (!trackingRes?.success) {
        setError(trackingRes?.message || "No se pudo obtener el pedido");
        setTracking(null);
        setLoading(false);
        return;
      }

      const nextTracking = trackingRes.tracking as TrackingData;
      setTracking(nextTracking);

      if (pushRes?.success) {
        setPushConfig({
          enabled: pushRes.enabled,
          publicKey: pushRes.publicKey,
        });
        void syncExistingSubscription(nextTracking.trackingCode, pushRes.publicKey);
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [code, syncExistingSubscription]);

  const handleEnablePush = async () => {
    if (!tracking?.trackingCode) {
      message.error("No se pudo identificar el pedido");
      return;
    }

    if (!pushConfig.enabled || !pushConfig.publicKey) {
      message.warning("Push no esta habilitado en el servidor");
      return;
    }

    setSubscribing(true);
    try {
      const subscription = await ensurePushSubscription(pushConfig.publicKey);
      const res = await registerBuyerPushSubscriptionAPI(tracking.trackingCode, subscription);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo activar push");
      }

      setPushLinked(true);
      message.success("Te avisaremos cuando el pedido cambie de estado");
    } catch (pushError: any) {
      message.error(pushError?.message || "No se pudo activar push");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <Result
        status="404"
        title="Tracking no disponible"
        subTitle={error || "No encontramos este pedido."}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 16px",
        background:
          "linear-gradient(180deg, #eaf3ff 0%, #f8fbff 38%, #ffffff 100%)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: 20,
            border: "1px solid #dbeafe",
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <div>
              <Text style={{ color: "#2563eb", fontWeight: 700, letterSpacing: "0.06em" }}>
                TRACKING DE PEDIDO
              </Text>
              <Title level={2} style={{ marginTop: 8, marginBottom: 8 }}>
                Estado actual: {tracking.estado_pedido}
              </Title>
              <Paragraph style={{ marginBottom: 0, color: "#475569" }}>
                Pedido para <strong>{tracking.cliente || "Cliente"}</strong> en{" "}
                <strong>{tracking.lugar_entrega || "destino"}</strong>.
              </Paragraph>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <Card size="small" style={{ borderRadius: 14, background: "#f8fafc" }}>
                <Text type="secondary">Codigo de seguimiento</Text>
                <div style={{ fontWeight: 700, marginTop: 6 }}>{tracking.trackingCode}</div>
              </Card>
              <Card size="small" style={{ borderRadius: 14, background: "#f8fafc" }}>
                <Text type="secondary">Hora acordada</Text>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {formatDeliveryTime(tracking.hora_entrega_acordada)}
                </div>
              </Card>
            </div>

            <Alert
              type="info"
              showIcon
              message="Notificaciones push"
              description="Si las activas en este navegador, te avisaremos cuando el pedido este confirmado, en camino o entregado."
            />

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Text type="secondary">
                {pushLinked
                  ? "Push activo en este dispositivo."
                  : pushIsSupported()
                    ? "Activa push para recibir avisos aunque cierres la pagina."
                    : "Este navegador no soporta push."}
              </Text>
              <Button
                type="primary"
                onClick={handleEnablePush}
                loading={subscribing}
                disabled={!pushConfig.enabled || !pushIsSupported() || pushLinked}
              >
                {pushLinked ? "Push activo" : "Activar notificaciones"}
              </Button>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default TrackingPage;
