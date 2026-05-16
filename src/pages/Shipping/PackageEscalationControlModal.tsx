import { Button, Checkbox, Empty, InputNumber, Modal, Select, Space, Spin, Tabs, Typography, message } from "antd";
import { InboxOutlined, TruckOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  getSimplePackageBranchPricesAPI,
  getPackageEscalationConfigAPI,
  PackageDeliverySpace,
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

const DEFAULT_DELIVERY_RANGES: PackageEscalationRange[] = [
  { from: 1, to: 5, small_price: 5, large_price: 5 },
  { from: 6, to: 15, small_price: 4, large_price: 4 },
  { from: 16, to: null, small_price: 3, large_price: 3 },
];

const DEFAULT_DELIVERY_SPACES: PackageDeliverySpace[] = [
  { size: "small_limit", spaces: 1 },
];

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 8,
  verticalAlign: "middle",
};

const normalizeRanges = (rows: PackageEscalationRange[] | undefined, fallback: PackageEscalationRange[]) => {
  const normalized = (Array.isArray(rows) && rows.length ? rows : fallback).slice(0, 3).map((row, index) => ({
    from: Number(row?.from ?? fallback[index]?.from ?? 1),
    to: row?.to === null || row?.to === undefined ? null : Number(row.to),
    small_price: Number(row?.small_price ?? fallback[index]?.small_price ?? 0),
    large_price: Number(row?.large_price ?? fallback[index]?.large_price ?? 0),
  }));

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    if (previous.to !== null && previous.to !== undefined) {
      normalized[index].from = Number(previous.to) + 1;
    }
  }
  if (normalized.length) normalized[normalized.length - 1].to = null;
  return normalized;
};

const formatRangeLabel = (row: PackageEscalationRange) => {
  if (row.to === null || row.to === undefined) return `${row.from}+`;
  return `${row.from} a ${row.to}`;
};

const PackageEscalationControlModal = ({ visible, onClose }: PackageEscalationControlModalProps) => {
  const [activeTab, setActiveTab] = useState("packages");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [applyToVisible, setApplyToVisible] = useState(false);
  const [targetRouteIds, setTargetRouteIds] = useState<string[]>([]);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [spacesModalVisible, setSpacesModalVisible] = useState(false);
  const [externalRanges, setExternalRanges] = useState<PackageEscalationRange[]>(DEFAULT_EXTERNAL_RANGES);
  const [simpleRanges, setSimpleRanges] = useState<PackageEscalationRange[]>(DEFAULT_SIMPLE_RANGES);
  const [deliveryRanges, setDeliveryRanges] = useState<PackageEscalationRange[]>(DEFAULT_DELIVERY_RANGES);
  const [deliverySpaces, setDeliverySpaces] = useState<PackageDeliverySpace[]>(DEFAULT_DELIVERY_SPACES);

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
      setDeliveryRanges(normalizeRanges(response.data?.delivery, DEFAULT_DELIVERY_RANGES));
      setDeliverySpaces(
        Array.isArray(response.data?.delivery_spaces) && response.data.delivery_spaces.length
          ? [
              {
                size: "small_limit",
                spaces: Math.max(
                  1,
                  Number(
                    response.data.delivery_spaces.find((row: any) => String(row?.size || "").toLowerCase() === "small_limit")
                      ?.spaces ??
                      response.data.delivery_spaces.find((row: any) => String(row?.size || "").toLowerCase() === "estandar")
                        ?.spaces ??
                      1
                  )
                ),
              },
            ]
          : DEFAULT_DELIVERY_SPACES
      );
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
    serviceOrigin: "external" | "simple_package" | "delivery",
    index: number,
    patch: Partial<PackageEscalationRange>
  ) => {
    const setter =
      serviceOrigin === "external"
        ? setExternalRanges
        : serviceOrigin === "delivery"
        ? setDeliveryRanges
        : setSimpleRanges;
    setter((current) => {
      const next = current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : { ...row }));

      for (let rowIndex = 1; rowIndex < next.length; rowIndex += 1) {
        const previous = next[rowIndex - 1];
        if (previous.to !== null && previous.to !== undefined) {
          next[rowIndex].from = Number(previous.to) + 1;
        }
        if (
          rowIndex < next.length - 1 &&
          next[rowIndex].to !== null &&
          next[rowIndex].to !== undefined &&
          Number(next[rowIndex].to) < Number(next[rowIndex].from)
        ) {
          next[rowIndex].to = next[rowIndex].from;
        }
      }

      next[next.length - 1].to = null;
      return next;
    });
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
        safeRouteIds.flatMap((routeId) =>
          activeTab === "delivery"
            ? [
                upsertPackageEscalationConfigAPI({
                  routeId,
                  serviceOrigin: "delivery",
                  ranges: deliveryRanges,
                  deliverySpaces,
                }),
              ]
            : [
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
              ]
        )
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

  const saveDeliverySpaces = async () => {
    setSaving(true);
    try {
      const response = await upsertPackageEscalationConfigAPI({
        serviceOrigin: "delivery",
        ranges: deliveryRanges,
        deliverySpaces,
      });
      if (!response?.success) {
        message.error(response?.message || "No se pudo guardar el limite de espacios");
        return;
      }
      message.success("Limite de espacios guardado");
      setSpacesModalVisible(false);
      if (selectedRouteId) await loadConfig(selectedRouteId);
    } catch (error) {
      console.error(error);
      message.error("Error guardando el limite de espacios");
    } finally {
      setSaving(false);
    }
  };

  const renderRangesTable = (
    title: string,
    serviceOrigin: "external" | "simple_package" | "delivery",
    ranges: PackageEscalationRange[],
    priceMode: "package" | "delivery" = "package"
  ) => (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: 700 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={tableCellStyle}>Rango</th>
            <th style={tableCellStyle}>Desde</th>
            <th style={tableCellStyle}>Hasta</th>
            {priceMode === "delivery" ? (
              <th style={tableCellStyle}>Precio por espacio</th>
            ) : (
              <>
                <th style={tableCellStyle}>Pequenas</th>
                <th style={tableCellStyle}>Grandes</th>
              </>
            )}
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
                  disabled={index > 0}
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
                      to: value === null || value === undefined ? row.from : Number(value),
                    })
                  }
                />
              </td>
              {priceMode === "delivery" ? (
                <td style={tableCellStyle}>
                  <InputNumber
                    min={0}
                    value={row.small_price}
                    addonBefore="Bs."
                    style={{ width: "100%" }}
                    onChange={(value) =>
                      updateRange(serviceOrigin, index, {
                        small_price: Number(value || 0),
                        large_price: Number(value || 0),
                      })
                    }
                  />
                </td>
              ) : (
                <>
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
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHeader = (title: string, subtitle: string) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "14px 16px",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      <Typography.Title level={4} style={{ margin: 0, letterSpacing: 0 }}>
        {title}
      </Typography.Title>
      <Typography.Text type="secondary">{subtitle}</Typography.Text>
    </div>
  );

  const renderRouteSelector = (showSpacesButton = false) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end" }}>
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
      {showSpacesButton && <Button onClick={() => setSpacesModalVisible(true)}>Espacios</Button>}
    </div>
  );

  const renderFooter = () => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      <Button onClick={onClose}>Cancelar</Button>
      <Button loading={saving} disabled={!selectedRouteId} onClick={() => saveRanges([selectedRouteId])}>
        Aplicar aqui
      </Button>
      <Button type="primary" loading={saving} disabled={!selectedRouteId} onClick={() => setApplyToVisible(true)}>
        Aplicar a...
      </Button>
    </div>
  );

  const renderPackagesTab = () => (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {renderHeader("Control de Escalonamiento: Precio Paquetes", "Define precios por cantidad para entregas externas y paquetes simples.")}
      {renderRouteSelector()}
      {!selectedRouteId ? (
        <Empty description="Selecciona una ruta para editar sus rangos" />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {renderRangesTable("Externas", "external", externalRanges)}
          {renderRangesTable("Simples", "simple_package", simpleRanges)}
        </div>
      )}
      {renderFooter()}
    </Space>
  );

  const renderDeliveryTab = () => (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {renderHeader("Control de Escalonamiento: Delivery", "Define el precio por espacio de delivery segun la ruta y la cantidad de paquetes.")}
      {renderRouteSelector(true)}
      {!selectedRouteId ? (
        <Empty description="Selecciona una ruta para editar sus rangos" />
      ) : (
        renderRangesTable("Delivery", "delivery", deliveryRanges, "delivery")
      )}
      {renderFooter()}
    </Space>
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabPosition="left"
          items={[
            {
              key: "packages",
              icon: <InboxOutlined />,
              label: "Paquetes",
              children: renderPackagesTab(),
            },
            {
              key: "delivery",
              icon: <TruckOutlined />,
              label: "Delivery",
              children: renderDeliveryTab(),
            },
          ]}
        />
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
      <Modal
        title="Limite de espacios"
        open={spacesModalVisible}
        onCancel={() => setSpacesModalVisible(false)}
        onOk={saveDeliverySpaces}
        okText="Listo"
        cancelText="Cancelar"
        okButtonProps={{ loading: saving }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text>
            Los paquetes con esta cantidad de espacios o menos se consideran pequenos. Si pasan este limite, se cobran como grandes.
          </Typography.Text>
          <div>
            <Typography.Text strong>Espacios maximos para pequeno</Typography.Text>
            <InputNumber
              min={1}
              value={deliverySpaces[0]?.spaces || 1}
              style={{ width: "100%", marginTop: 8 }}
              onChange={(value) =>
                setDeliverySpaces([{ size: "small_limit", spaces: Math.max(1, Number(value || 1)) }])
              }
            />
          </div>
        </Space>
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
