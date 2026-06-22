import { Alert, Button, Modal, Space, Spin, Switch, Typography, message } from "antd";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import {
  getTrackingFreezeConfigAPI,
  updateTrackingFreezeConfigAPI,
} from "../../api/shipping";

interface TrackingFreezeControlModalProps {
  visible: boolean;
  onClose: () => void;
}

const TrackingFreezeControlModal = ({ visible, onClose }: TrackingFreezeControlModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await getTrackingFreezeConfigAPI();
      if (!response?.success) {
        message.error(response?.message || "No se pudo cargar el congelamiento");
        return;
      }

      const nextEnabled = response.data?.enabled === true;
      setEnabled(nextEnabled);
      setDraftEnabled(nextEnabled);
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el congelamiento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    void loadConfig();
  }, [visible]);

  const closeWithoutSaving = () => {
    setDraftEnabled(enabled);
    onClose();
  };

  const applyChange = async () => {
    setSaving(true);
    try {
      const response = await updateTrackingFreezeConfigAPI(draftEnabled);
      if (!response?.success) {
        message.error(response?.message || "No se pudo aplicar el cambio");
        return;
      }

      setEnabled(response.config?.enabled === true);
      setDraftEnabled(response.config?.enabled === true);
      message.success(
        draftEnabled
          ? "Pedidos externos y simples congelados"
          : "Pedidos externos y simples descongelados"
      );
      onClose();
    } catch (error) {
      console.error(error);
      message.error("No se pudo aplicar el cambio");
    } finally {
      setSaving(false);
    }
  };

  const confirmChange = () => {
    Modal.confirm({
      title: draftEnabled
        ? "Congelar pedidos externos/simples"
        : "Descongelar pedidos externos/simples",
      content: draftEnabled
        ? "Los pedidos con delivery se mantendran en su estado actual hasta que reviertas el switch."
        : "Los pedidos con delivery volveran a calcular su seguimiento desde este momento hasta que vuelvas a activar el switch.",
      okText: "Confirmar",
      cancelText: "Cancelar",
      onOk: applyChange,
    });
  };

  const question = draftEnabled
    ? "¿Desea descongelar los pedidos externos/simples?"
    : "¿Desea congelar los pedidos externos/simples?";

  return (
    <Modal
      title="Control de seguimiento"
      open={visible}
      onCancel={closeWithoutSaving}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <Space align="center" size={14}>
              <Switch
                checked={draftEnabled}
                checkedChildren={<PauseCircleOutlined />}
                unCheckedChildren={<PlayCircleOutlined />}
                onChange={setDraftEnabled}
              />
              <div>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {question}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  Afecta solo pedidos externos/simples con traslado entre sucursales.
                </Typography.Text>
              </div>
            </Space>
          </div>

          <Alert
            type={draftEnabled ? "warning" : "info"}
            showIcon
            message={
              draftEnabled
                ? "Mientras este activo, los pedidos con delivery no avanzaran automaticamente en el tracking publico."
                : "Al descongelar, los pedidos pendientes recalcularan su cronograma como si empezaran ahora."
            }
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={closeWithoutSaving}>Cancelar</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={draftEnabled === enabled}
              onClick={confirmChange}
            >
              Confirmar
            </Button>
          </div>
        </Space>
      </Spin>
    </Modal>
  );
};

export default TrackingFreezeControlModal;
