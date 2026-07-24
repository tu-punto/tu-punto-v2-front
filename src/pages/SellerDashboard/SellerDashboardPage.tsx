import { useContext, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Empty, Row, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CrownOutlined } from "@ant-design/icons";
import { UserContext } from "../../context/userContext";
import { getSellerDashboardAPI } from "../../api/seller";

type DashboardBranch = {
  branchId: string;
  branchName: string;
  revenue: number;
  units: number;
};

type AvailableBranch = {
  id: string;
  name: string;
  active?: boolean;
};

type DashboardData = {
  sellerId: string;
  sellerName: string;
  availableBranches: AvailableBranch[];
  totals: {
    totalRevenue: number;
    totalUnits: number;
    ticketAverage: number;
    internalRevenue: number;
    catalogRevenue: number;
    internalUnits: number;
    catalogUnits: number;
  };
  monthlySeries: Array<{
    month: string;
    internalRevenue: number;
    catalogRevenue: number;
    totalRevenue: number;
    units: number;
  }>;
  topProducts: Array<{
    productName: string;
    units: number;
    revenue: number;
    channels: string[];
  }>;
  channelBreakdown: Array<{
    channel: string;
    revenue: number;
    units: number;
  }>;
  branchBreakdown: DashboardBranch[];
  activePromotions: Array<{
    id: string;
    productName: string;
    scope: string;
    title?: string;
    endsAt: string;
    simplePrice?: number | null;
    tiers: Array<{ minQuantity: number; unitPrice: number }>;
  }>;
};

const formatMoney = (value?: number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(Number(value || 0));

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const channelColor: Record<string, string> = {
  interno: "blue",
  catalogo: "green",
  ambos: "purple"
};

const branchPalette = ["#0ea5e9", "#2563eb", "#7c3aed", "#14b8a6", "#f97316", "#ec4899"];

const getButtonStyle = (active: boolean, variant: "month" | "branch") => ({
  borderRadius: 999,
  borderColor: active ? "rgba(15, 118, 110, 0.25)" : "rgba(148, 163, 184, 0.35)",
  background: active
    ? variant === "month"
      ? "linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(37, 99, 235, 0.14) 100%)"
      : "linear-gradient(135deg, rgba(14, 165, 233, 0.20) 0%, rgba(124, 58, 237, 0.14) 100%)"
    : "rgba(255, 255, 255, 0.9)",
  color: active ? "#0f172a" : "#334155",
  boxShadow: active ? "0 10px 24px rgba(15, 23, 42, 0.08)" : "none",
});

const SellerDashboardPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useContext(UserContext);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  const branchOptions = useMemo(() => {
    const activeBranches = (data?.availableBranches || []).filter((branch) => branch.active !== false);
    return activeBranches.length ? activeBranches : data?.availableBranches || [];
  }, [data?.availableBranches]);

  const branchIdsKey = useMemo(() => selectedBranchIds.slice().sort().join(","), [selectedBranchIds]);

  const branchFilterIds = useMemo(() => {
    if (!branchOptions.length) return undefined;
    if (!selectedBranchIds.length) return undefined;
    if (selectedBranchIds.length >= branchOptions.length) return undefined;
    return selectedBranchIds;
  }, [branchOptions.length, selectedBranchIds, branchIdsKey]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id_vendedor) return;

      setLoading(true);
      try {
        const response = await getSellerDashboardAPI(String(user.id_vendedor), {
          months,
          sucursalIds: branchFilterIds,
        });

        if (!response?.ok && !response?.success) {
          messageApi.error("No se pudo cargar el dashboard del vendedor");
          return;
        }

        setData(response.dashboard);
      } catch (error) {
        console.error("Error cargando dashboard del vendedor:", error);
        messageApi.error("No se pudo cargar el dashboard del vendedor");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [branchFilterIds, messageApi, months, user?.id_vendedor]);

  const selectedBranchCount = branchOptions.length && !selectedBranchIds.length
    ? branchOptions.length
    : selectedBranchIds.length;

  const allBranchesSelected = !selectedBranchIds.length || selectedBranchIds.length >= branchOptions.length;

  const visibleBranchIds = useMemo(
    () => branchOptions.map((branch) => branch.id).filter(Boolean),
    [branchOptions]
  );

  const selectedBranchLabel = allBranchesSelected
    ? `Todas (${branchOptions.length || 0})`
    : `${selectedBranchCount} seleccionadas`;

  const pieData = useMemo(() => {
    const rows = data?.branchBreakdown || [];
    const total = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    let start = 0;

    return rows.map((row, index) => {
      const percent = total > 0 ? (Number(row.revenue || 0) / total) * 100 : 0;
      const end = start + percent;
      const entry = {
        ...row,
        color: branchPalette[index % branchPalette.length],
        percent,
        start,
        end,
      };
      start = end;
      return entry;
    });
  }, [data?.branchBreakdown]);

  const pieGradient = pieData.length
    ? `conic-gradient(${pieData.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`
    : "linear-gradient(135deg, rgba(226, 232, 240, 0.85), rgba(241, 245, 249, 0.95))";

  const totalBranchRevenue = useMemo(
    () => (data?.branchBreakdown || []).reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    [data?.branchBreakdown]
  );

  const initialLoad = loading && !data;

  const highestMonthRevenue = useMemo(
    () => Math.max(...(data?.monthlySeries?.map((item) => Number(item.totalRevenue || 0)) || [0])),
    [data?.monthlySeries]
  );

  const topProductColumns: ColumnsType<DashboardData["topProducts"][number]> = [
    {
      title: "#",
      key: "rank",
      width: 72,
      render: (_value, _row, index) => {
        const rank = index + 1;
        const isTop = rank === 1;
        return (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontWeight: 700,
              color: isTop ? "#b45309" : "#475569",
              background: isTop ? "linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(251, 191, 36, 0.12))" : "rgba(241,245,249,0.9)",
              boxShadow: isTop ? "inset 0 0 0 1px rgba(245, 158, 11, 0.35)" : "inset 0 0 0 1px rgba(226, 232, 240, 1)"
            }}
          >
            {isTop ? <CrownOutlined style={{ color: "#d97706", fontSize: 14 }} /> : null}
            <span>{rank}</span>
          </div>
        );
      }
    },
    {
      title: "Producto",
      dataIndex: "productName",
      key: "productName",
      render: (value, row, index) => (
        <Space direction="vertical" size={6}>
          <Space size={8} wrap>
            <Typography.Text strong>{value}</Typography.Text>
            {index === 0 && <Tag color="gold" bordered={false}>Mas vendido</Tag>}
          </Space>
          <Space size={6} wrap>
            {row.channels.map((channel) => (
              <Tag key={`${value}-${channel}`} color={channelColor[channel] || "default"} bordered={false}>
                {channel}
              </Tag>
            ))}
          </Space>
        </Space>
      )
    },
    {
      title: "Unidades",
      dataIndex: "units",
      key: "units",
      render: (value) => <Tag color="blue" bordered={false}>{value} uds</Tag>
    },
    {
      title: "Ingreso",
      dataIndex: "revenue",
      key: "revenue",
      render: (value) => <Tag color="green" bordered={false}>{formatMoney(value)}</Tag>
    }
  ];

  const handleMonthChange = (nextMonths: number) => setMonths(nextMonths);

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranchIds((current) => {
      if (!current.length) return [branchId];

      const normalizedCurrent = current.filter((id) => visibleBranchIds.includes(id));
      const exists = normalizedCurrent.includes(branchId);

      return exists
        ? normalizedCurrent.filter((id) => id !== branchId)
        : [...normalizedCurrent, branchId];
    });
  };

  const handleAllBranches = () => setSelectedBranchIds([]);

  if (!user?.id_vendedor) {
    return (
      <div style={{ padding: 16 }}>
        {contextHolder}
        <Empty description="No se pudo resolver el vendedor actual." />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {contextHolder}
      <Card
        style={{
          borderRadius: 28,
          background: "linear-gradient(140deg, rgba(14,165,233,0.10) 0%, rgba(255,255,255,1) 58%)",
          boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} lg={16}>
              <Space direction="vertical" size={8}>
                <Tag color="cyan" bordered={false} style={{ width: "fit-content" }}>
                  Vista comercial
                </Tag>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {data?.sellerName || user?.nombre_vendedor || "Dashboard del vendedor"}
                </Typography.Title>
                <Typography.Text type="secondary">
                  Resumen de ventas, canales, productos estrella y promociones activas.
                </Typography.Text>
              </Space>
            </Col>
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Periodo
                </Typography.Text>
                <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
                  {[3, 6, 12].map((value) => {
                    const active = months === value;
                    return (
                      <Button
                        key={value}
                        shape="round"
                        size="middle"
                        onClick={() => handleMonthChange(value)}
                        style={getButtonStyle(active, "month")}
                      >
                        Últimos {value} meses
                      </Button>
                    );
                  })}
                </Space>
              </Space>
            </Col>
          </Row>

          <div
            style={{
              padding: 16,
              borderRadius: 24,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(255,255,255,0.72)",
            }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Sucursales
                  </Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {selectedBranchLabel}
                    </Typography.Text>
                  </div>
                </div>
                <Typography.Text type="secondary">
                  {branchOptions.length ? "Selecciona una o varias sucursales para filtrar el dashboard." : "No hay sucursales asignadas."}
                </Typography.Text>
              </div>

              <Space wrap size={8} style={{ width: "100%" }}>
                <Button
                  shape="round"
                  size="middle"
                  onClick={handleAllBranches}
                  style={getButtonStyle(allBranchesSelected, "branch")}
                >
                  Todas
                </Button>
                {branchOptions.map((branch) => {
                  const active = selectedBranchIds.includes(branch.id);
                  return (
                    <Button
                      key={branch.id}
                      shape="round"
                      size="middle"
                      onClick={() => handleBranchToggle(branch.id)}
                      style={getButtonStyle(active, "branch")}
                    >
                      {branch.name}
                    </Button>
                  );
                })}
              </Space>
            </Space>
          </div>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            { label: "Ingreso total", value: formatMoney(data?.totals?.totalRevenue), tone: "#0f766e" },
            { label: "Unidades vendidas", value: data?.totals?.totalUnits || 0, tone: "#0f172a" },
            { label: "Ticket promedio", value: formatMoney(data?.totals?.ticketAverage), tone: "#1d4ed8" },
            { label: "Promos activas", value: data?.activePromotions?.length || 0, tone: "#7c3aed" }
          ].map((item) => (
            <Col xs={24} md={12} xl={6} key={item.label}>
            <Card loading={initialLoad} style={{ borderRadius: 22 }}>
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0 0", color: item.tone }}>
                {item.value}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card loading={loading} title="Evolución mensual" style={{ borderRadius: 22 }}>
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              {(data?.monthlySeries || []).map((item) => {
                const width = highestMonthRevenue > 0 ? Math.max(8, (item.totalRevenue / highestMonthRevenue) * 100) : 8;

                return (
                  <div key={item.month}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Typography.Text strong>{item.month}</Typography.Text>
                      <Typography.Text>{formatMoney(item.totalRevenue)}</Typography.Text>
                    </div>
                    <div
                      style={{
                        height: 14,
                        borderRadius: 999,
                        background: "#e2e8f0",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${width}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #0891b2 0%, #22c55e 100%)"
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                      Interno {formatMoney(item.internalRevenue)} · Catálogo {formatMoney(item.catalogRevenue)} · {item.units} unidades
                    </div>
                  </div>
                );
              })}
              {!data?.monthlySeries?.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin ventas para el rango seleccionado." />}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card loading={loading} title="Sucursales con más movimiento" style={{ borderRadius: 22 }}>
            {pieData.length ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        position: "relative",
                        width: 220,
                        aspectRatio: "1 / 1",
                        borderRadius: "50%",
                        background: pieGradient,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.7), 0 16px 28px rgba(15, 23, 42, 0.08)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 26,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.96)",
                          boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.18)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: 12,
                        }}
                      >
                        <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
                          Ingreso total
                        </Typography.Text>
                        <Typography.Title level={4} style={{ margin: "6px 0 0" }}>
                          {formatMoney(totalBranchRevenue)}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          {pieData.length} sucursales
                        </Typography.Text>
                      </div>
                    </div>
                  </div>

                  <Space direction="vertical" size={12} style={{ width: "100%", flex: 1, minWidth: 220 }}>
                    {pieData.map((segment) => (
                      <div key={segment.branchId || segment.branchName}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <Space size={8}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: segment.color,
                                boxShadow: "0 0 0 3px rgba(255,255,255,0.9)",
                              }}
                            />
                            <Typography.Text strong>{segment.branchName}</Typography.Text>
                          </Space>
                          <Typography.Text strong>{formatMoney(segment.revenue)}</Typography.Text>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#64748b", fontSize: 12 }}>
                          <span>{segment.units} unidades</span>
                          <span>{formatPercent(segment.percent)}</span>
                        </div>
                      </div>
                    ))}
                  </Space>
                </div>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin movimiento para las sucursales seleccionadas." />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card loading={loading} title="Productos estrella" style={{ borderRadius: 22 }}>
            <Table
              rowKey="productName"
              size="middle"
              tableLayout="fixed"
              className="seller-dashboard-table"
              rowClassName={(_, index) => (index === 0 ? "seller-dashboard-table-top-row" : "")}
              columns={topProductColumns}
              dataSource={data?.topProducts || []}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Card loading={loading} title="Promociones activas" style={{ marginTop: 16, borderRadius: 22 }}>
        <Table
          rowKey="id"
          pagination={false}
          className="seller-dashboard-table"
          dataSource={data?.activePromotions || []}
          rowClassName={(_, index) => (index === 0 ? "seller-dashboard-table-top-row" : "")}
          columns={[
            {
              title: "Producto",
              dataIndex: "productName",
              key: "productName",
              render: (value, record) => (
                <Space direction="vertical" size={4}>
                  <Space size={6} wrap>
                    <Typography.Text strong>{value}</Typography.Text>
                    <Tag color="geekblue" bordered={false}>Activa</Tag>
                  </Space>
                  <Typography.Text type="secondary">{record.title || "Promoción sin título"}</Typography.Text>
                </Space>
              )
            },
            {
              title: "Alcance",
              dataIndex: "scope",
              key: "scope",
              render: (value) => <Tag color={channelColor[value] || "default"} bordered={false}>{value}</Tag>
            },
            {
              title: "Precio",
              key: "price",
              render: (_value, record) => (
                <Tag color="gold" bordered={false}>
                  {record.simplePrice ? formatMoney(record.simplePrice) : "Variable"}
                </Tag>
              )
            },
            {
              title: "Vigencia",
              dataIndex: "endsAt",
              key: "endsAt",
              render: (value) => <Tag color="default" bordered={false}>{new Date(value).toLocaleDateString("es-BO")}</Tag>
            }
          ]}
        />
      </Card>

      <Card loading={loading} title="Canales" style={{ marginTop: 16, borderRadius: 22 }}>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          {(data?.channelBreakdown || []).map((item) => (
            <div key={item.channel}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Tag color={channelColor[item.channel] || "default"} bordered={false}>
                  {item.channel}
                </Tag>
                <Typography.Text strong>{formatMoney(item.revenue)}</Typography.Text>
              </div>
              <Typography.Text type="secondary">{item.units} unidades</Typography.Text>
            </div>
          ))}
        </Space>
      </Card>

      <style>{`
        .seller-dashboard-table .ant-table-thead > tr > th {
          background: linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.9)) !important;
          color: #334155;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .seller-dashboard-table .ant-table-thead > tr > th:first-child {
          border-start-start-radius: 14px;
        }
        .seller-dashboard-table .ant-table-thead > tr > th:last-child {
          border-start-end-radius: 14px;
        }
        .seller-dashboard-table .ant-table-tbody > tr > td {
          padding-top: 16px;
          padding-bottom: 16px;
        }
        .seller-dashboard-table-top-row td {
          background: rgba(255, 255, 255, 0.98) !important;
        }
        .seller-dashboard-table-top-row td:first-child {
          font-weight: 700;
        }
        .seller-dashboard-table-top-row td:first-child::before {
          content: "";
          display: inline-block;
          width: 0;
        }
      `}</style>
    </div>
  );
};

export default SellerDashboardPage;
