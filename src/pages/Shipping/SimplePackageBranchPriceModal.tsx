import { Button, Empty, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getSimplePackageBranchPricesAPI, upsertSimplePackageBranchPriceAPI } from "../../api/simplePackage";
import { getSucursalsAPI } from "../../api/sucursal";

interface SimplePackageBranchPriceModalProps {
  visible: boolean;
  onClose: () => void;
}

const SimplePackageBranchPriceModal = ({ visible, onClose }: SimplePackageBranchPriceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [newOriginId, setNewOriginId] = useState("");
  const [newDestinationId, setNewDestinationId] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchResponse, pricesResponse] = await Promise.all([
        getSucursalsAPI(),
        getSimplePackageBranchPricesAPI(),
      ]);
      setBranches(Array.isArray(branchResponse) ? branchResponse : []);
      const nextRows = Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : [];
      setRows(nextRows);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar las rutas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    void loadData();
  }, [visible]);

  const addOriginOptions = useMemo(
    () =>
      branches.map((branch: any) => ({
        value: String(branch?._id || ""),
        label: String(branch?.nombre || "Sucursal"),
      })),
    [branches]
  );

  const addDestinationOptions = useMemo(() => {
    if (!newOriginId) return [];
    const usedDestinations = new Set(
      rows
        .filter((row: any) => String(row?.origen_sucursal?._id || row?.origen_sucursal || "") === String(newOriginId))
        .map((row: any) => String(row?.destino_sucursal?._id || row?.destino_sucursal || ""))
    );

    return branches
      .filter((branch: any) => {
        const branchId = String(branch?._id || "");
        return branchId && !usedDestinations.has(branchId);
      })
      .map((branch: any) => ({
        value: String(branch?._id || ""),
        label: String(branch?.nombre || "Sucursal"),
      }));
  }, [branches, newOriginId, rows]);

  const handleUpsert = async (payload: { originBranchId: string; destinationBranchId: string }) => {
    setSaving(true);
    try {
      const response = await upsertSimplePackageBranchPriceAPI(payload);
      if (!response.success) {
        message.error(response.message || "No se pudo guardar la ruta");
        return false;
      }
      await loadData();
      return true;
    } catch (error) {
      console.error(error);
      message.error("Error guardando la ruta");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Rutas"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
            <Typography.Text strong>Nueva ruta</Typography.Text>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_32px_1fr_auto] gap-3 items-end mt-3">
              <Select
                value={newOriginId || undefined}
                onChange={(value) => {
                  setNewOriginId(String(value || ""));
                  setNewDestinationId("");
                }}
                options={addOriginOptions}
                placeholder="Sucursal origen"
                showSearch
                optionFilterProp="label"
              />
              <div style={{ textAlign: "center", fontSize: 22, color: "#6b7280" }}>→</div>
              <Select
                value={newDestinationId || undefined}
                onChange={(value) => setNewDestinationId(String(value || ""))}
                options={addDestinationOptions}
                placeholder="Sucursal destino"
                disabled={!newOriginId}
                showSearch
                optionFilterProp="label"
              />
              <Button
                type="primary"
                loading={saving}
                disabled={!newOriginId || !newDestinationId}
                onClick={async () => {
                  const ok = await handleUpsert({
                    originBranchId: newOriginId,
                    destinationBranchId: newDestinationId,
                  });
                  if (ok) {
                    setNewDestinationId("");
                  }
                }}
              >
                Crear ruta
              </Button>
            </div>
          </div>

          {rows.length === 0 ? (
            <Empty description="Aun no hay rutas configuradas" />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map((row: any) => {
                const rowId = String(row?._id || `${row?.origen_sucursal?._id}-${row?.destino_sucursal?._id}`);
                return (
                  <div
                    key={rowId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 32px 1fr",
                      gap: 12,
                      alignItems: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 14,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{row?.origen_sucursal?.nombre || "Origen"}</div>
                    <div style={{ textAlign: "center", fontSize: 22, color: "#6b7280" }}>→</div>
                    <div style={{ fontWeight: 600 }}>{row?.destino_sucursal?.nombre || "Destino"}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Space>
      </Spin>
    </Modal>
  );
};

export default SimplePackageBranchPriceModal;
