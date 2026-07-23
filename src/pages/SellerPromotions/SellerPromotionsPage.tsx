import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import {
  createSellerPromotionAPI,
  deleteSellerPromotionAPI,
  getSellerPromotionVariantOptionsAPI,
  getSellerPromotionsAPI,
  previewSellerPromotionAPI,
  updateSellerPromotionAPI
} from "../../api/sellerPromotions";

type PromotionTier = {
  minQuantity: number;
  unitPrice: number;
};

type PromotionRow = {
  id: string;
  productId: string;
  productName: string;
  variantKey: string;
  variantLabel: string;
  basePrice: number;
  totalStock: number;
  scope: "interno" | "catalogo" | "ambos";
  title?: string;
  simplePrice?: number | null;
  tiers: PromotionTier[];
  startsAt: string;
  endsAt: string;
  state: "draft" | "active" | "disabled";
  effectiveState: "scheduled" | "active" | "expired" | "disabled" | "draft";
};

type VariantOption = {
  key: string;
  productId: string;
  variantKey: string;
  productName: string;
  variantLabel: string;
  displayName: string;
  basePrice: number;
  totalStock: number;
};

type PromotionFormValues = {
  selection?: string;
  productId?: string;
  variantKey?: string;
  scope: "interno" | "catalogo" | "ambos";
  title?: string;
  simplePrice?: number | null;
  tiers?: PromotionTier[];
  startsAt: string;
  endsAt: string;
  state: "draft" | "active" | "disabled";
};

const formatMoney = (value?: number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(Number(value || 0));

const datetimeLocalValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoString = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const scopeMeta: Record<string, { color: string; label: string }> = {
  interno: { color: "blue", label: "Interno" },
  catalogo: { color: "green", label: "Catálogo" },
  ambos: { color: "purple", label: "Ambos" }
};

const stateMeta: Record<string, { color: string; label: string }> = {
  draft: { color: "default", label: "Borrador" },
  active: { color: "success", label: "Activa" },
  disabled: { color: "warning", label: "Deshabilitada" },
  scheduled: { color: "processing", label: "Programada" },
  expired: { color: "error", label: "Expirada" }
};

const SellerPromotionsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PromotionFormValues>();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scope, setScope] = useState<"all" | "interno" | "catalogo" | "ambos">("all");
  const [state, setState] = useState<string | undefined>(undefined);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variantOptionsLoading, setVariantOptionsLoading] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PromotionRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const loadPromotions = async () => {
    setLoading(true);
    const response = await getSellerPromotionsAPI({
      q: debouncedSearch || undefined,
      scope,
      state,
      page,
      limit
    });
    setRows(Array.isArray(response?.rows) ? response.rows : []);
    setTotal(Number(response?.total || 0));
    setLoading(false);
  };

  const loadVariantOptions = async (query?: string) => {
    setVariantOptionsLoading(true);
    const response = await getSellerPromotionVariantOptionsAPI({ q: query || undefined });
    setVariantOptions(Array.isArray(response?.rows) ? response.rows : []);
    setVariantOptionsLoading(false);
  };

  useEffect(() => {
    void loadPromotions();
  }, [debouncedSearch, scope, state, page, limit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVariantOptions(variantSearch.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [variantSearch]);

  useEffect(() => {
    void loadVariantOptions();
  }, []);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.scope] += 1;
        acc[row.effectiveState] = (acc[row.effectiveState] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        interno: 0,
        catalogo: 0,
        ambos: 0,
        active: 0,
        scheduled: 0
      } as Record<string, number>
    );
  }, [rows]);

  const resetForm = () => {
    form.resetFields();
    setPreviewData(null);
    setEditingRow(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
    form.setFieldsValue({
      scope: "ambos",
      state: "active",
      tiers: [{ minQuantity: 3, unitPrice: undefined as unknown as number }]
    });
  };

  const handleOpenEdit = (row: PromotionRow) => {
    setEditingRow(row);
    setPreviewData(null);
    setModalOpen(true);
    form.setFieldsValue({
      selection: `${row.productId}::${row.variantKey}`,
      productId: row.productId,
      variantKey: row.variantKey,
      scope: row.scope,
      title: row.title,
      simplePrice: row.simplePrice ?? undefined,
      tiers: row.tiers?.length ? row.tiers : undefined,
      startsAt: datetimeLocalValue(row.startsAt),
      endsAt: datetimeLocalValue(row.endsAt),
      state: row.state
    });
  };

  const handleDelete = async (id: string) => {
    const result = await deleteSellerPromotionAPI(id);
    if (result?.success === false) {
      messageApi.error(String(result?.message || "No se pudo eliminar la promoción"));
      return;
    }
    messageApi.success("Promoción eliminada");
    void loadPromotions();
  };

  const handleSelectionChange = (value?: string) => {
    const selected = variantOptions.find((item) => item.key === value);
    form.setFieldsValue({
      selection: value,
      productId: selected?.productId,
      variantKey: selected?.variantKey,
      simplePrice: undefined
    });
    setPreviewData(null);
  };

  const handlePreview = async () => {
    const values = await form.validateFields();
    setPreviewLoading(true);
    const result = await previewSellerPromotionAPI({
      productId: values.productId,
      variantKey: values.variantKey,
      scope: values.scope,
      quantity: values.tiers?.[0]?.minQuantity || 1,
      simplePrice: values.simplePrice,
      tiers: values.tiers || []
    });
    setPreviewLoading(false);
    if (result?.success === false) {
      messageApi.error(String(result?.message || "No se pudo calcular la vista previa"));
      return;
    }
    setPreviewData(result?.preview || null);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      productId: values.productId,
      variantKey: values.variantKey,
      scope: values.scope,
      title: values.title,
      simplePrice: values.simplePrice,
      tiers: values.tiers || [],
      startsAt: toIsoString(values.startsAt),
      endsAt: toIsoString(values.endsAt),
      state: values.state
    };

    const result = editingRow
      ? await updateSellerPromotionAPI(editingRow.id, payload)
      : await createSellerPromotionAPI(payload);

    if (result?.success === false) {
      messageApi.error(String(result?.message || "No se pudo guardar la promoción"));
      return;
    }

    messageApi.success(editingRow ? "Promoción actualizada" : "Promoción creada");
    setModalOpen(false);
    resetForm();
    void loadPromotions();
  };

  const columns: ColumnsType<PromotionRow> = [
    {
      title: "Producto",
      dataIndex: "productName",
      key: "productName",
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.productName}</Typography.Text>
          <div style={{ color: "#64748b", fontSize: 12 }}>{row.variantLabel}</div>
        </div>
      )
    },
    {
      title: "Canal",
      dataIndex: "scope",
      key: "scope",
      render: (value: string) => <Tag color={scopeMeta[value]?.color}>{scopeMeta[value]?.label || value}</Tag>
    },
    {
      title: "Precio promo",
      key: "pricing",
      render: (_, row) => (
        <div>
          <Typography.Text>{row.simplePrice ? formatMoney(row.simplePrice) : "Por escalas"}</Typography.Text>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            Base {formatMoney(row.basePrice)} · Stock {row.totalStock}
          </div>
          {row.tiers?.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {row.tiers.map((tier) => (
                <Tag key={`${row.id}-${tier.minQuantity}`} bordered={false} color="cyan">
                  {tier.minQuantity}+ = {formatMoney(tier.unitPrice)}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      title: "Vigencia",
      key: "schedule",
      render: (_, row) => (
        <div>
          <div>{new Date(row.startsAt).toLocaleDateString("es-BO")}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            hasta {new Date(row.endsAt).toLocaleDateString("es-BO")}
          </div>
        </div>
      )
    },
    {
      title: "Estado",
      key: "effectiveState",
      render: (_, row) => (
        <Space direction="vertical" size={4}>
          <Tag color={stateMeta[row.effectiveState]?.color}>{stateMeta[row.effectiveState]?.label}</Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Config: {stateMeta[row.state]?.label}
          </Typography.Text>
        </Space>
      )
    },
    {
      title: "Acciones",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(row)} />
          <Popconfirm
            title="Eliminar promoción"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDelete(row.id)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 16 }}>
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          <Card
            style={{
              borderRadius: 24,
              background:
                "linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(14,116,144,0.02) 100%)"
            }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Tag color="cyan" bordered={false} style={{ width: "fit-content" }}>
                Promociones por variante
              </Tag>
              <Typography.Title level={2} style={{ margin: 0 }}>
                Rebajas independientes para interno, catálogo o ambos
              </Typography.Title>
              <Typography.Text type="secondary">
                Define precio directo, escalas por cantidad y fechas exactas para cada variante.
              </Typography.Text>
              <Space wrap>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                  Nueva promoción
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => void loadPromotions()}>
                  Recargar
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={7}>
          <Card style={{ borderRadius: 24 }}>
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Typography.Text strong>Activación rápida</Typography.Text>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Activas ahora</span>
                  <span>{summary.active || 0}</span>
                </div>
                <Progress percent={Math.min(100, ((summary.active || 0) / Math.max(rows.length, 1)) * 100)} showInfo={false} strokeColor="#0891b2" />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Programadas</span>
                  <span>{summary.scheduled || 0}</span>
                </div>
                <Progress percent={Math.min(100, ((summary.scheduled || 0) / Math.max(rows.length, 1)) * 100)} showInfo={false} strokeColor="#6366f1" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {[
          { label: "Total visibles", value: summary.total || 0, tone: "#0f172a" },
          { label: "Solo interno", value: summary.interno || 0, tone: "#2563eb" },
          { label: "Solo catálogo", value: summary.catalogo || 0, tone: "#16a34a" },
          { label: "Mixtas", value: summary.ambos || 0, tone: "#7c3aed" }
        ].map((card) => (
          <Col xs={24} md={12} xl={6} key={card.label}>
            <Card style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={4}>
                <Typography.Text type="secondary">{card.label}</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, color: card.tone }}>
                  {card.value}
                </Typography.Title>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 16, borderRadius: 24 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por producto o variante"
              prefix={<EyeOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              value={scope}
              onChange={(value) => {
                setScope(value);
                setPage(1);
              }}
              style={{ width: "100%" }}
              options={[
                { value: "all", label: "Todos los canales" },
                { value: "interno", label: "Solo interno" },
                { value: "catalogo", label: "Solo catálogo" },
                { value: "ambos", label: "Ambos" }
              ]}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              value={state}
              allowClear
              placeholder="Todos los estados"
              onChange={(value) => {
                setState(value);
                setPage(1);
              }}
              style={{ width: "100%" }}
              options={[
                { value: "draft", label: "Borrador" },
                { value: "active", label: "Activa" },
                { value: "disabled", label: "Deshabilitada" }
              ]}
            />
          </Col>
        </Row>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (nextPage, nextLimit) => {
              setPage(nextPage);
              setLimit(nextLimit);
            }
          }}
        />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          resetForm();
        }}
        onOk={() => void handleSubmit()}
        width={880}
        okText={editingRow ? "Guardar cambios" : "Crear promoción"}
        title={editingRow ? "Editar promoción" : "Nueva promoción"}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={15}>
            <Form form={form} layout="vertical" initialValues={{ scope: "ambos", state: "active" }}>
              <Form.Item
                name="selection"
                label="Variante"
                rules={[{ required: true, message: "Selecciona una variante" }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={setVariantSearch}
                  onChange={handleSelectionChange}
                  loading={variantOptionsLoading}
                  placeholder="Busca producto o variante"
                  options={variantOptions.map((item) => ({
                    value: item.key,
                    label: `${item.displayName} · ${formatMoney(item.basePrice)} · Stock ${item.totalStock}`
                  }))}
                />
              </Form.Item>

              <Form.Item name="productId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="variantKey" hidden>
                <Input />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="scope" label="Aplica a" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "interno", label: "Interno" },
                        { value: "catalogo", label: "Catálogo" },
                        { value: "ambos", label: "Ambos" }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="state" label="Estado" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "active", label: "Activa" },
                        { value: "draft", label: "Borrador" },
                        { value: "disabled", label: "Deshabilitada" }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="title" label="Título interno">
                <Input placeholder="Ej. Rebaja de fin de mes" maxLength={90} />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="simplePrice" label="Precio fijo promocional">
                    <InputNumber min={0} style={{ width: "100%" }} controls={false} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Button style={{ marginTop: 29 }} icon={<GiftOutlined />} onClick={() => void handlePreview()} loading={previewLoading}>
                    Vista previa
                  </Button>
                </Col>
              </Row>

              <Form.List name="tiers">
                {(fields, { add, remove }) => (
                  <Card
                    size="small"
                    title="Escalas por cantidad"
                    extra={
                      <Button type="link" onClick={() => add({ minQuantity: 3 })}>
                        Agregar tramo
                      </Button>
                    }
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size={12}>
                      {fields.map((field) => (
                        <Row gutter={12} key={field.key} align="middle">
                          <Col span={10}>
                            <Form.Item
                              {...field}
                              name={[field.name, "minQuantity"]}
                              label="Desde"
                              rules={[{ required: true, message: "Cantidad mínima" }]}
                            >
                              <InputNumber min={2} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item
                              {...field}
                              name={[field.name, "unitPrice"]}
                              label="Precio unitario"
                              rules={[{ required: true, message: "Precio unitario" }]}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} controls={false} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Button danger onClick={() => remove(field.name)}>
                              Quitar
                            </Button>
                          </Col>
                        </Row>
                      ))}
                    </Space>
                  </Card>
                )}
              </Form.List>

              <Row gutter={12} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Form.Item name="startsAt" label="Inicio" rules={[{ required: true }]}>
                    <Input type="datetime-local" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endsAt" label="Fin" rules={[{ required: true }]}>
                    <Input type="datetime-local" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Col>

          <Col xs={24} lg={9}>
            <Card
              title="Impacto estimado"
              style={{
                borderRadius: 18,
                background: "linear-gradient(180deg, rgba(14,165,233,0.08), rgba(255,255,255,1))"
              }}
            >
              {previewData ? (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div>
                    <Typography.Text type="secondary">Variante</Typography.Text>
                    <div style={{ fontWeight: 700 }}>{previewData.variantLabel}</div>
                  </div>
                  <div>
                    <Typography.Text type="secondary">Base</Typography.Text>
                    <div>{formatMoney(previewData.basePrice)}</div>
                  </div>
                  <div>
                    <Typography.Text type="secondary">Precio efectivo</Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0, color: "#0f766e" }}>
                      {formatMoney(previewData.effectivePrice)}
                    </Typography.Title>
                  </div>
                  <div>
                    <Typography.Text type="secondary">Ahorro unitario</Typography.Text>
                    <div>{formatMoney((previewData.basePrice || 0) - (previewData.effectivePrice || 0))}</div>
                  </div>
                  {(previewData.tiers || []).length > 0 && (
                    <div>
                      <Typography.Text type="secondary">Escalas</Typography.Text>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {previewData.tiers.map((tier: PromotionTier) => (
                          <Tag key={`${tier.minQuantity}-${tier.unitPrice}`} color="cyan" bordered={false}>
                            {tier.minQuantity}+ = {formatMoney(tier.unitPrice)}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  Usa la vista previa para validar el precio final antes de guardar.
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default SellerPromotionsPage;
