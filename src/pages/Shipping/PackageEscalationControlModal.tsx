import { Button, Checkbox, Empty, InputNumber, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  getSimplePackageBranchPricesAPI,
  getPackageEscalationConfigAPI,
  PackageEscalationRange,
  upsertPackageEscalationConfigAPI,
} from "../../api/simplePackage";
import SimplePackageBranchPriceModal from "./SimplePackageBranchPriceModal";

interface PackageEscalationControlModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_EXTERNAL_RANGES: PackageEscalationRange[] = [
  { from: 1, to: 5, small_price: 5, large_price: 10 },
  { from: 6, to: 15, small_price: 4, large_price: 8 },
  { from: 16, to: null, small_price: 3, large_price: 6 },
];

const DEFAULT_SIMPLE_RANGES: PackageEscalationRange[] = [
  { from: 1, to: 30, small_price: 4, large_price: 8 },
  { from: 31, to: 60, small_price: 3, large_price: 6 },
  { from: 61, to: null, small_price: 2.5, large_price: 5 },
];

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 8,
  verticalAlign: "middle",
};

const normalizeRanges = (rows: PackageEscalationRange[] | undefined, fallback: PackageEscalationRange[]) =>
  (Array.isArray(rows) && rows.length ? rows : fallback).slice(0, 3).map((row, index) => ({
    from: Number(row?.from ?? fallback[index]?.from ?? 1),
    to: row?.to === null || row?.to === undefined ? null : Number(row.to),
    small_price: Number(row?.small_price ?? fallback[index]?.small_price ?? 0),
    large_price: Number(row?.large_price ?? fallback[index]?.large_price ?? 0),
  }));

const formatRangeLabel = (row: PackageEscalationRange) => {
  if (row.to === null || row.to === undefined) return `${row.from}+`;
  return `${row.from} a ${row.to}`;
};

const PackageEscalationControlModal = ({ visible, onClose }: PackageEscalationControlModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [applyToVisible, setApplyToVisible] = useState(false);
  const [targetRouteIds, setTargetRouteIds] = useState<string[]>([]);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [externalRanges, setExternalRanges] = useState<PackageEscalationRange[]>(DEFAULT_EXTERNAL_RANGES);
  const [simpleRanges, setSimpleRanges] = useState<PackageEscalationRange[]>(DEFAULT_SIMPLE_RANGES);

  const routeOptions = useMemo(
    () =>
      routes.map((route) => ({
        value: String(route?._id || ""),
        label: `${String(route?.origen_sucursal?.nombre || "Origen")} -> ${String(route?.destino_sucursal?.nombre || "Destino")}`,
      })),
    [routes]
  );

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const response = await getSimplePackageBranchPricesAPI();
      const nextRoutes = Array.isArray(response?.rows) ? response.rows : [];
      setRoutes(nextRoutes);
      setSelectedRouteId((current) => current || String(nextRoutes[0]?._id || ""));
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar las rutas");
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (routeId: string) => {
    if (!routeId) return;
    setLoading(true);
    try {
      const response = await getPackageEscalationConfigAPI({ routeId });
      if (!response?.success) {
        message.error(response?.message || "No se pudo cargar el escalonamiento");
        return;
      }

      setExternalRanges(normalizeRanges(response.data?.external, DEFAULT_EXTERNAL_RANGES));
      setSimpleRanges(normalizeRanges(response.data?.simple_package, DEFAULT_SIMPLE_RANGES));
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el escalonamiento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    void loadRoutes();
  }, [visible]);

  useEffect(() => {
    if (!visible || !selectedRouteId) return;
    void loadConfig(selectedRouteId);
  }, [visible, selectedRouteId]);

  const updateRange = (
    serviceOrigin: "external" | "simple_package",
    index: number,
    patch: Partial<PackageEscalationRange>
  ) => {
    const setter = serviceOrigin === "external" ? setExternalRanges : setSimpleRanges;
    setter((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const saveRanges = async (routeIds: string[]) => {
    const safeRouteIds = routeIds.filter(Boolean);
    if (!safeRouteIds.length) {
      message.warning("Selecciona al menos una ruta");
      return;
    }

    setSaving(true);
    try {
      const responses = await Promise.all(
        safeRouteIds.flatMap((routeId) => [
          upsertPackageEscalationConfigAPI({
            routeId,
            serviceOrigin: "external",
            ranges: externalRanges,
          }),
          upsertPackageEscalationConfigAPI({
            routeId,
            serviceOrigin: "simple_package",
            ranges: simpleRanges,
          }),
        ])
      );

      const failed = responses.find((response: any) => !response?.success);
      if (failed) {
        message.error(failed.message || "No se pudo guardar el escalonamiento");
        return;
      }

      message.success("Escalonamiento aplicado");
      setApplyToVisible(false);
      setTargetRouteIds([]);
      if (selectedRouteId) await loadConfig(selectedRouteId);
    } catch (error) {
      console.error(error);
      message.error("Error guardando el escalonamiento");
    } finally {
      setSaving(false);
    }
  };

  const renderRangesTable = (
    title: string,
    serviceOrigin: "external" | "simple_package",
    ranges: PackageEscalationRange[]
  ) => (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: 700 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={tableCellStyle}>Rango</th>
            <th style={tableCellStyle}>Desde</th>
            <th style={tableCellStyle}>Hasta</th>
            <th style={tableCellStyle}>Pequenas</th>
            <th style={tableCellStyle}>Grandes</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((row, index) => (
            <tr key={`${serviceOrigin}-${index}`}>
              <td style={tableCellStyle}>{formatRangeLabel(row)}</td>
              <td style={tableCellStyle}>
                <InputNumber
                  min={1}
                  value={row.from}
                  style={{ width: "100%" }}
                  onChange={(value) => updateRange(serviceOrigin, index, { from: Number(value || 1) })}
                />
              </td>
              <td style={tableCellStyle}>
                <InputNumber
                  min={row.from}
                  value={row.to ?? undefined}
                  placeholder="Sin limite"
                  style={{ width: "100%" }}
                  disabled={index === ranges.length - 1}
                  onChange={(value) =>
                    updateRange(serviceOrigin, index, {
                      to: value === null || value === undefined ? null : Number(value),
                    })
                  }
                />
              </td>
              <td style={tableCellStyle}>
                <InputNumber
                  min={0}
                  value={row.small_price}
                  addonBefore="Bs."
                  style={{ width: "100%" }}
                  onChange={(value) => updateRange(serviceOrigin, index, { small_price: Number(value || 0) })}
                />
              </td>
              <td style={tableCellStyle}>
                <InputNumber
                  min={0}
                  value={row.large_price}
                  addonBefore="Bs."
                  style={{ width: "100%" }}
                  onChange={(value) => updateRange(serviceOrigin, index, { large_price: Number(value || 0) })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Modal
      title="Control de Escalonamiento"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1040}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <div>
            <Typography.Text strong>Ruta</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 8 }}
              value={selectedRouteId || undefined}
              options={routeOptions}
              placeholder="Selecciona una ruta"
              showSearch
              optionFilterProp="label"
              onChange={(value) => setSelectedRouteId(String(value || ""))}
            />
            </div>
            <Button onClick={() => setRouteModalVisible(true)}>Rutas</Button>
          </div>

          {!selectedRouteId ? (
            <Empty description="Selecciona una ruta para editar sus rangos" />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {renderRangesTable("Externas", "external", externalRanges)}
              {renderRangesTable("Simples", "simple_package", simpleRanges)}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button loading={saving} disabled={!selectedRouteId} onClick={() => saveRanges([selectedRouteId])}>
              Aplicar aqui
            </Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!selectedRouteId}
              onClick={() => setApplyToVisible(true)}
            >
              Aplicar a...
            </Button>
          </div>
        </Space>
      </Spin>
      <Modal
        title="Aplicar escalonamiento a rutas"
        open={applyToVisible}
        onCancel={() => {
          setApplyToVisible(false);
          setTargetRouteIds([]);
        }}
        onOk={() => saveRanges(targetRouteIds)}
        okText="Aplicar"
        cancelText="Cancelar"
        confirmLoading={saving}
      >
        {routeOptions.length === 0 ? (
          <Empty description="Aun no hay rutas configuradas" />
        ) : (
          <Checkbox.Group
            value={targetRouteIds}
            onChange={(values) => setTargetRouteIds(values.map(String))}
            style={{ width: "100%" }}
          >
            <div style={{ display: "grid", gap: 10, maxHeight: 340, overflowY: "auto", paddingTop: 4 }}>
              {routeOptions.map((route) => (
                <label
                  key={route.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                >
                  <Checkbox value={route.value} />
                  <span style={{ fontWeight: 600 }}>{route.label}</span>
                </label>
              ))}
            </div>
          </Checkbox.Group>
        )}
      </Modal>
      <SimplePackageBranchPriceModal
        visible={routeModalVisible}
        onClose={() => {
          setRouteModalVisible(false);
          void loadRoutes();
        }}
      />
    </Modal>
  );
};

export default PackageEscalationControlModal;
