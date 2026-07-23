import { useContext, useEffect, useMemo, useState } from "react";
import { Card, Col, Empty, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserContext } from "../../context/userContext";
import { getSellerDashboardAPI } from "../../api/seller";

type DashboardData = {
  sellerId: string;
  sellerName: string;
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
  branchBreakdown: Array<{
    branchName: string;
    revenue: number;
    units: number;
  }>;
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

const channelColor: Record<string, string> = {
  interno: "blue",
  catalogo: "green",
  ambos: "purple"
};

const SellerDashboardPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useContext(UserContext);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id_vendedor) return;
      setLoading(true);
      const response = await getSellerDashboardAPI(String(user.id_vendedor), { months });
      if (!response?.success) {
        messageApi.error("No se pudo cargar el dashboard del vendedor");
        setLoading(false);
        return;
      }
      setData(response.dashboard);
      setLoading(false);
    };

    void loadDashboard();
  }, [messageApi, months, user?.id_vendedor]);

  const highestMonthRevenue = useMemo(
    () => Math.max(...(data?.monthlySeries?.map((item) => item.totalRevenue) || [0])),
    [data?.monthlySeries]
  );

  const topProductColumns: ColumnsType<DashboardData["topProducts"][number]> = [
    {
      title: "Producto",
      dataIndex: "productName",
      key: "productName",
      render: (value, row) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div style={{ marginTop: 4 }}>
            {row.channels.map((channel) => (
              <Tag key={`${value}-${channel}`} color={channelColor[channel] || "default"} bordered={false}>
                {channel}
              </Tag>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Unidades",
      dataIndex: "units",
      key: "units"
    },
    {
      title: "Ingreso",
      dataIndex: "revenue",
      key: "revenue",
      render: (value) => formatMoney(value)
    }
  ];

  const branchColumns: ColumnsType<DashboardData["branchBreakdown"][number]> = [
    {
      title: "Sucursal",
      dataIndex: "branchName",
      key: "branchName"
    },
    {
      title: "Unidades",
      dataIndex: "units",
      key: "units"
    },
    {
      title: "Ingreso",
      dataIndex: "revenue",
      key: "revenue",
      render: (value) => formatMoney(value)
    }
  ];

  if (!user?.id_vendedor) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="No se pudo resolver el vendedor actual." />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {contextHolder}
      <Card
        loading={loading}
        style={{
          borderRadius: 28,
          background: "linear-gradient(140deg, rgba(14,165,233,0.1) 0%, rgba(255,255,255,1) 56%)"
        }}
      >
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
            <Select
              value={months}
              onChange={setMonths}
              style={{ width: "100%" }}
              options={[
                { value: 3, label: "Últimos 3 meses" },
                { value: 6, label: "Últimos 6 meses" },
                { value: 12, label: "Últimos 12 meses" }
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {[
          { label: "Ingreso total", value: formatMoney(data?.totals?.totalRevenue), tone: "#0f766e" },
          { label: "Unidades vendidas", value: data?.totals?.totalUnits || 0, tone: "#0f172a" },
          { label: "Ticket promedio", value: formatMoney(data?.totals?.ticketAverage), tone: "#1d4ed8" },
          { label: "Promos activas", value: data?.activePromotions?.length || 0, tone: "#7c3aed" }
        ].map((item) => (
          <Col xs={24} md={12} xl={6} key={item.label}>
            <Card loading={loading} style={{ borderRadius: 22 }}>
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
                const width = highestMonthRevenue
                  ? Math.max(8, (item.totalRevenue / highestMonthRevenue) * 100)
                  : 8;
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
          <Card loading={loading} title="Canales" style={{ borderRadius: 22 }}>
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
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <Card loading={loading} title="Productos estrella" style={{ borderRadius: 22 }}>
            <Table
              rowKey="productName"
              columns={topProductColumns}
              dataSource={data?.topProducts || []}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card loading={loading} title="Sucursales con más movimiento" style={{ borderRadius: 22 }}>
            <Table
              rowKey="branchName"
              columns={branchColumns}
              dataSource={data?.branchBreakdown || []}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Card loading={loading} title="Promociones activas" style={{ marginTop: 16, borderRadius: 22 }}>
        <Row gutter={[16, 16]}>
          {(data?.activePromotions || []).map((promotion) => (
            <Col xs={24} md={12} xl={8} key={promotion.id}>
              <Card size="small" style={{ borderRadius: 18, background: "rgba(248,250,252,0.9)" }}>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <Typography.Text strong>{promotion.productName}</Typography.Text>
                    <Tag color={channelColor[promotion.scope] || "default"} bordered={false}>
                      {promotion.scope}
                    </Tag>
                  </div>
                  <Typography.Text type="secondary">{promotion.title || "Promoción sin título"}</Typography.Text>
                  <Typography.Text>
                    {promotion.simplePrice ? formatMoney(promotion.simplePrice) : "Precio variable por cantidad"}
                  </Typography.Text>
                  {promotion.tiers?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {promotion.tiers.map((tier) => (
                        <Tag key={`${promotion.id}-${tier.minQuantity}`} color="cyan" bordered={false}>
                          {tier.minQuantity}+ = {formatMoney(tier.unitPrice)}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <Typography.Text type="secondary">
                    Vigente hasta {new Date(promotion.endsAt).toLocaleDateString("es-BO")}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          ))}
          {!data?.activePromotions?.length && (
            <Col span={24}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay promociones activas en este momento." />
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default SellerDashboardPage;
