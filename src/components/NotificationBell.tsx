import {
  Badge,
  Button,
  Empty,
  List,
  Popover,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { normalizeRole } from "../utils/role";
import {
  getNotificationsAPI,
  getPushPublicConfigAPI,
  getUnreadNotificationsCountAPI,
  markAllNotificationsAsReadAPI,
  markNotificationAsReadAPI,
  registerInternalPushSubscriptionAPI,
} from "../api/notification";
import { ensurePushSubscription, getExistingPushSubscription, pushIsSupported } from "../utils/push";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string;
  shippingId?: string;
  data?: {
    urlPath?: string;
    screen?: string;
  };
};

const { Text } = Typography;

const formatNotificationDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  });
};

const NotificationBell = ({ compact = false }: { compact?: boolean }) => {
  const { user } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  const enabledForRole = role === "admin" || role === "operator" || role === "seller";

  const [open, setOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushConfig, setPushConfig] = useState<{ enabled?: boolean; publicKey?: string | null }>({});
  const [pushLinked, setPushLinked] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!enabledForRole) return;
    const res = await getUnreadNotificationsCountAPI();
    if (res?.success) {
      setUnreadCount(Number(res.unreadCount || 0));
    }
  }, [enabledForRole]);

  const fetchNotifications = useCallback(async () => {
    if (!enabledForRole) return;
    setLoadingList(true);
    const res = await getNotificationsAPI(15);
    if (res?.success) {
      setNotifications(Array.isArray(res.notifications) ? res.notifications : []);
    }
    setLoadingList(false);
  }, [enabledForRole]);

  const syncExistingSubscription = useCallback(
    async (publicKey?: string | null) => {
      if (!enabledForRole || !publicKey || !pushIsSupported() || Notification.permission !== "granted") return;
      try {
        const existing = await getExistingPushSubscription();
        if (!existing) {
          setPushLinked(false);
          return;
        }
        const res = await registerInternalPushSubscriptionAPI(existing.toJSON());
        if (res?.success) {
          setPushLinked(true);
        }
      } catch (error) {
        console.error("No se pudo sincronizar push interno:", error);
      }
    },
    [enabledForRole]
  );

  useEffect(() => {
    if (!enabledForRole) return;

    getPushPublicConfigAPI().then((res) => {
      if (!res?.success) return;
      setPushConfig({
        enabled: res.enabled,
        publicKey: res.publicKey,
      });
      void syncExistingSubscription(res.publicKey);
    });

    void fetchUnreadCount();
  }, [enabledForRole, fetchUnreadCount, syncExistingSubscription]);

  useEffect(() => {
    if (!enabledForRole) return;
    const timer = window.setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [enabledForRole, fetchUnreadCount]);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications();
  }, [open, fetchNotifications]);

  const handleEnablePush = async () => {
    if (!pushConfig.enabled || !pushConfig.publicKey) {
      message.warning("Push no esta habilitado en el servidor");
      return;
    }

    setSubscribing(true);
    try {
      const subscription = await ensurePushSubscription(pushConfig.publicKey);
      const res = await registerInternalPushSubscriptionAPI(subscription);
      if (!res?.success) {
        throw new Error(res?.message || "No se pudo registrar la suscripcion");
      }

      setPushLinked(true);
      message.success("Push activado para este navegador");
    } catch (error: any) {
      message.error(error?.message || "No se pudo activar push");
    } finally {
      setSubscribing(false);
    }
  };

  const handleItemClick = async (notification: NotificationItem) => {
    if (!notification?.read) {
      await markNotificationAsReadAPI(notification._id);
      setUnreadCount((current) => Math.max(0, current - 1));
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, read: true } : item
        )
      );
    }

    setOpen(false);
    const targetPath = String(notification?.data?.urlPath || "").trim();
    if (targetPath) {
      navigate(targetPath);
      return;
    }

    navigate(notification?.shippingId ? "/shipping" : "/servicesPage");
  };

  const handleReadAll = async () => {
    const res = await markAllNotificationsAsReadAPI();
    if (res?.success) {
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    }
  };

  const content = useMemo(
    () => (
      <div style={{ width: compact ? 300 : 360 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <Text strong>Notificaciones</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Avisos operativos y comunicados del servicio.
              </Text>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button size="small" type="link" onClick={handleReadAll} style={{ paddingInline: 0 }}>
              Marcar todo
            </Button>
          )}
        </div>

        {!pushLinked ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#f5f9ff",
              border: "1px solid #dbeafe",
            }}
          >
            <div>
              <Text strong style={{ fontSize: 13 }}>
                Activar notificaciones
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {pushIsSupported()
                    ? "Activalas para recibir avisos fuera de la app"
                    : "Este navegador no soporta push"}
                </Text>
              </div>
            </div>
            <Button
              size="small"
              type="primary"
              loading={subscribing}
              disabled={!pushConfig.enabled || !pushIsSupported()}
              onClick={handleEnablePush}
            >
              Activar
            </Button>
          </div>
        ) : null}

        {loadingList ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "18px 0" }}>
            <Spin size="small" />
          </div>
        ) : notifications.length ? (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item._id}
                onClick={() => void handleItemClick(item)}
                style={{
                  cursor: "pointer",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 8,
                  border: `1px solid ${item.read ? "#e5e7eb" : "#bfdbfe"}`,
                  background: item.read ? "#ffffff" : "#eff6ff",
                }}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{item.title}</span>
                      {!item.read && <Tag color="blue">Nuevo</Tag>}
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ color: "#334155", marginBottom: 4 }}>{item.body}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatNotificationDate(item.createdAt)}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Sin notificaciones" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    ),
    [
      compact,
      handleEnablePush,
      loadingList,
      notifications,
      pushConfig.enabled,
      pushLinked,
      subscribing,
      unreadCount,
    ]
  );

  if (!enabledForRole) return null;

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={content}
      open={open}
      onOpenChange={setOpen}
    >
      <Button
        type="text"
        aria-label="Notificaciones"
        style={{
          color: "#eaf5ff",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(255,255,255,0.08)",
          width: compact ? 40 : 44,
          height: compact ? 40 : 44,
        }}
      >
        <Badge count={unreadCount} size="small" offset={[2, -2]}>
          <BellOutlined style={{ fontSize: compact ? 18 : 20, color: "#eaf5ff" }} />
        </Badge>
      </Button>
    </Popover>
  );
};

export default NotificationBell;
