import { useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  TimePicker,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
import {
  createSellerPromotionAPI,
  deleteSellerPromotionAPI,
  getSellerPromotionVariantOptionsAPI,
  getSellerPromotionsAPI,
  previewSellerPromotionAPI,
  updateSellerPromotionAPI,
} from "../../api/sellerPromotions";
import { getSellersBasicAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import { canAccessSellerProductInfo } from "../../constants/sellerProductInfoAccess";

type PromotionTier = {
  minQuantity: number;
  unitPrice: number;
};

type PromotionRow = {
  id: string;
  sellerId: string;
  sellerName?: string;
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
  pricingMode?: "simple" | "tiers" | "conditional" | "invalid";
  conditionalQuestion?: string | null;
  isInvalid?: boolean;
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
  pricingMode: "simple" | "tiers" | "conditional";
  title?: string;
  conditionalQuestion?: string;
  simplePrice?: number | null;
  tiers?: PromotionTier[];
  startsDate?: Dayjs | null;
  startsTime?: Dayjs | null;
  endsDate?: Dayjs | null;
  endsTime?: Dayjs | null;
  state: "draft" | "active" | "disabled";
};

type SellerOption = {
  value: string;
  label: string;
};

const ALL_SELLERS = "__all__";

const formatMoney = (value?: number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const combineDateTime = (date?: Dayjs | null, time?: Dayjs | null) => {
  if (!date) return undefined;
  const baseDate = dayjs(date);
  const baseTime = time ? dayjs(time) : dayjs().startOf("day");
  return baseDate
    .hour(baseTime.hour())
    .minute(baseTime.minute())
    .second(0)
    .millisecond(0)
    .toISOString();
};

const scopeMeta: Record<string, { color: string; label: string }> = {
  interno: { color: "blue", label: "Interno" },
  catalogo: { color: "green", label: "Catalogo" },
  ambos: { color: "purple", label: "Ambos" },
};

const stateMeta: Record<string, { color: string; label: string }> = {
  draft: { color: "default", label: "Borrador" },
  active: { color: "success", label: "Activa" },
  disabled: { color: "warning", label: "Deshabilitada" },
  scheduled: { color: "processing", label: "Programada" },
  expired: { color: "error", label: "Expirada" },
};

const SellerPromotionsPage = () => {
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PromotionFormValues>();
  const { user } = useContext(UserContext);
  const role = String(user?.role || "").trim().toLowerCase();
  const isManager = role === "admin" || role === "operator";
  const initialSellerParam = String(searchParams.get("sellerId") || "").trim();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scope, setScope] = useState<"all" | "interno" | "catalogo" | "ambos">("all");
  const [state, setState] = useState<string | undefined>(isManager ? "active" : undefined);
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    isManager ? initialSellerParam || ALL_SELLERS : ""
  );
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variantOptionsLoading, setVariantOptionsLoading] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PromotionRow | null>(null);

  const canUseCatalogScopes = isManager || canAccessSellerProductInfo(user);
  const effectiveSellerId = isManager ? (selectedSellerId === ALL_SELLERS ? undefined : selectedSellerId) : undefined;
  const canCreatePromotion = !isManager || Boolean(effectiveSellerId);
  const resolvedSellerId = isManager
    ? (selectedSellerId === ALL_SELLERS ? undefined : selectedSellerId)
    : String(user?.id_vendedor || "").trim() || undefined;

  const scopeOptions = useMemo(
    () =>
      !canUseCatalogScopes
        ? [{ value: "interno", label: "Solo interno" }]
        : [
            { value: "all", label: "Todos los canales" },
            { value: "interno", label: "Solo interno" },
            { value: "catalogo", label: "Solo catalogo" },
            { value: "ambos", label: "Ambos" },
          ],
    [canUseCatalogScopes]
  );

  const pricingMode = Form.useWatch("pricingMode", form) || "simple";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!isManager) return;
    void (async () => {
      const response = await getSellersBasicAPI({ onlyActiveOrRenewal: true });
      const items = Array.isArray(response) ? response : [];
      setSellerOptions([
        { value: ALL_SELLERS, label: "Todos los vendedores" },
        ...items
          .map((seller: any) => ({
            value: String(seller?._id || "").trim(),
            label: `${String(seller?.nombre || "").trim()} ${String(seller?.apellido || "").trim()}`.trim(),
          }))
          .filter((seller: SellerOption) => seller.value && seller.label),
      ]);
    })();
  }, [isManager]);

  const loadPromotions = async () => {
    setLoading(true);
    const response = await getSellerPromotionsAPI({
      sellerId: resolvedSellerId,
      q: debouncedSearch || undefined,
      scope: canUseCatalogScopes ? scope : "interno",
      state,
      page,
      limit,
    });
    setRows(Array.isArray(response?.rows) ? response.rows : []);
    setTotal(Number(response?.total || 0));
    setLoading(false);
  };

  const loadVariantOptions = async (query?: string) => {
    if (isManager && !effectiveSellerId) {
      setVariantOptions([]);
      return;
    }
    setVariantOptionsLoading(true);
    const response = await getSellerPromotionVariantOptionsAPI({
      q: query || undefined,
      sellerId: resolvedSellerId,
    });
    setVariantOptions(Array.isArray(response?.rows) ? response.rows : []);
    setVariantOptionsLoading(false);
  };

  useEffect(() => {
    if (!canUseCatalogScopes) {
      setScope("interno");
    }
  }, [canUseCatalogScopes]);

  useEffect(() => {
    setPage(1);
  }, [selectedSellerId, state, scope, debouncedSearch]);

  useEffect(() => {
    void loadPromotions();
  }, [debouncedSearch, scope, state, page, limit, canUseCatalogScopes, effectiveSellerId, resolvedSellerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVariantOptions(variantSearch.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [variantSearch, effectiveSellerId, isManager]);

  useEffect(() => {
    void loadVariantOptions();
  }, [resolvedSellerId, isManager]);

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
        scheduled: 0,
      } as Record<string, number>
    );
  }, [rows]);

  const resetForm = () => {
    form.resetFields();
    setPreviewData(null);
    setEditingRow(null);
  };

  const handleOpenCreate = () => {
    if (!canCreatePromotion) {
      messageApi.warning("Selecciona un vendedor para crear una promocion");
      return;
    }
    resetForm();
    setModalOpen(true);
    form.setFieldsValue({
      scope: canUseCatalogScopes ? "ambos" : "interno",
      state: "active",
      pricingMode: "simple",
      conditionalQuestion: undefined,
      startsDate: dayjs().startOf("day"),
      startsTime: dayjs().startOf("day"),
      endsTime: dayjs().startOf("day"),
      tiers: [{ minQuantity: 3, unitPrice: undefined as unknown as number }],
    });
  };

  useEffect(() => {
    const openDemoModal = () => {
      if (!canCreatePromotion) return;
      resetForm();
      setModalOpen(true);
      form.setFieldsValue({
        scope: canUseCatalogScopes ? "ambos" : "interno",
        state: "active",
        pricingMode: "simple",
        conditionalQuestion: undefined,
        startsDate: dayjs().startOf("day"),
        startsTime: dayjs().startOf("day"),
        endsTime: dayjs().startOf("day"),
        tiers: [{ minQuantity: 3, unitPrice: undefined as unknown as number }],
      });
    };
    const closeDemoModal = () => {
      setModalOpen(false);
      resetForm();
    };

    window.addEventListener("tp-tour-open-promotions-modal", openDemoModal);
    window.addEventListener("tp-tour-close-promotions-modal", closeDemoModal);

    return () => {
      window.removeEventListener("tp-tour-open-promotions-modal", openDemoModal);
      window.removeEventListener("tp-tour-close-promotions-modal", closeDemoModal);
    };
  }, [canCreatePromotion, canUseCatalogScopes, form]);

  const handleOpenEdit = (row: PromotionRow) => {
    if (row.isInvalid) {
      messageApi.error("Esta promocion es invalida porque mezcla precio fijo y escalas. Debe rehacerse.");
      return;
    }
    setEditingRow(row);
    setPreviewData(null);
    setModalOpen(true);
    form.setFieldsValue({
      selection: `${row.productId}::${row.variantKey}`,
      productId: row.productId,
      variantKey: row.variantKey,
      scope: canUseCatalogScopes ? row.scope : "interno",
      pricingMode: row.pricingMode === "tiers" ? "tiers" : row.pricingMode === "conditional" ? "conditional" : "simple",
      title: row.title,
      conditionalQuestion: row.conditionalQuestion || undefined,
      simplePrice: row.simplePrice ?? undefined,
      tiers: row.tiers?.length ? row.tiers : undefined,
      startsDate: row.startsAt ? dayjs(row.startsAt) : dayjs().startOf("day"),
      startsTime: row.startsAt ? dayjs(row.startsAt) : dayjs().startOf("day"),
      endsDate: row.endsAt ? dayjs(row.endsAt) : undefined,
      endsTime: row.endsAt ? dayjs(row.endsAt) : dayjs().startOf("day"),
      state: row.state,
    });
  };

  const handleDelete = async (id: string) => {
    const result = await deleteSellerPromotionAPI(id);
    if (result?.success === false) {
      messageApi.error(String(result?.message || "No se pudo eliminar la promocion"));
      return;
    }
    messageApi.success("Promocion eliminada");
    void loadPromotions();
  };

  const handleSelectionChange = (value?: string) => {
    const selected = variantOptions.find((item) => item.key === value);
    form.setFieldsValue({
      selection: value,
      productId: selected?.productId,
      variantKey: selected?.variantKey,
      simplePrice: undefined,
    });
    setPreviewData(null);
  };

  const handlePricingModeChange = (value: "simple" | "tiers" | "conditional") => {
    form.setFieldValue("pricingMode", value);
    if (value === "conditional") {
      form.setFieldValue("scope", "interno");
      form.setFieldValue("tiers", []);
    }
  };

  const handlePreview = async () => {
    const values = await form.validateFields();
    const startsAt = combineDateTime(values.startsDate, values.startsTime);
    const endsAt = combineDateTime(values.endsDate, values.endsTime);
    const simplePrice = values.pricingMode === "tiers" ? null : values.simplePrice;
    const tiers = values.pricingMode === "simple" || values.pricingMode === "conditional" ? [] : values.tiers || [];

    if ((values.pricingMode === "simple" || values.pricingMode === "conditional") && (simplePrice === undefined || simplePrice === null)) {
      messageApi.error("Define un precio fijo promocional");
      return;
    }
    if (values.pricingMode === "tiers" && tiers.length === 0) {
      messageApi.error("Agrega al menos un tramo por cantidad");
      return;
    }
    setPreviewLoading(true);
    const result = await previewSellerPromotionAPI({
      sellerId: isManager ? (editingRow?.sellerId || effectiveSellerId) : undefined,
      productId: values.productId,
      variantKey: values.variantKey,
      scope: canUseCatalogScopes ? values.scope : "interno",
      pricingMode: values.pricingMode,
      conditionalQuestion: values.conditionalQuestion,
      quantity: tiers?.[0]?.minQuantity || 1,
      simplePrice,
      tiers,
      startsAt,
      endsAt,
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
    const startsAt = combineDateTime(values.startsDate, values.startsTime);
    const endsAt = combineDateTime(values.endsDate, values.endsTime);
    const simplePrice = values.pricingMode === "tiers" ? null : values.simplePrice;
    const tiers = values.pricingMode === "simple" || values.pricingMode === "conditional" ? [] : values.tiers || [];

    if ((values.pricingMode === "simple" || values.pricingMode === "conditional") && (simplePrice === undefined || simplePrice === null)) {
      messageApi.error("Define un precio fijo promocional");
      return;
    }
    if (values.pricingMode === "tiers" && tiers.length === 0) {
      messageApi.error("Agrega al menos un tramo por cantidad");
      return;
    }

    const payload = {
      sellerId: isManager ? (editingRow?.sellerId || effectiveSellerId) : undefined,
      productId: values.productId,
      variantKey: values.variantKey,
      scope: canUseCatalogScopes ? values.scope : "interno",
      pricingMode: values.pricingMode,
      title: values.title,
      conditionalQuestion: values.conditionalQuestion,
      simplePrice,
      tiers,
      startsAt,
      endsAt,
      state: values.state,
    };

    const result = editingRow
      ? await updateSellerPromotionAPI(editingRow.id, payload)
      : await createSellerPromotionAPI(payload);

    if (result?.success === false) {
      messageApi.error(String(result?.message || "No se pudo guardar la promocion"));
      return;
    }

    messageApi.success(editingRow ? "Promocion actualizada" : "Promocion creada");
    setModalOpen(false);
    resetForm();
    void loadPromotions();
  };

  const columns: ColumnsType<PromotionRow> = [
    ...(isManager
      ? [
          {
            title: "Vendedor",
            dataIndex: "sellerName",
            key: "sellerName",
            render: (value?: string) => value || "Vendedor",
          },
        ]
      : []),
    {
      title: "Titulo",
      dataIndex: "title",
      key: "title",
      render: (value?: string) => value || "Sin titulo",
    },
    {
      title: "Producto",
      dataIndex: "productName",
      key: "productName",
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.productName}</Typography.Text>
          <div style={{ color: "#64748b", fontSize: 12 }}>{row.variantLabel}</div>
        </div>
      ),
    },
    {
      title: "Canal",
      dataIndex: "scope",
      key: "scope",
      render: (value: string) => <Tag color={scopeMeta[value]?.color}>{scopeMeta[value]?.label || value}</Tag>,
    },
    {
      title: "Precio promo",
      key: "pricing",
      render: (_, row) => (
        <div>
          <Typography.Text>
            {row.pricingMode === "conditional"
              ? `Condicional ${row.simplePrice ? formatMoney(row.simplePrice) : ""}`
              : row.simplePrice ? formatMoney(row.simplePrice) : "Por escalas"}
          </Typography.Text>
          {row.pricingMode === "conditional" && row.conditionalQuestion && (
            <div style={{ color: "#7c3aed", fontSize: 12, marginTop: 4 }}>{row.conditionalQuestion}</div>
          )}
          {row.isInvalid && (
            <div style={{ marginTop: 6 }}>
              <Tag color="red">Invalida: mezcla precio fijo y escalas</Tag>
            </div>
          )}
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
      ),
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
      ),
    },
    {
      title: "Estado",
      key: "effectiveState",
      render: (_, row) => (
        <Space direction="vertical" size={4}>
          <Tag color={row.isInvalid ? "red" : stateMeta[row.effectiveState]?.color}>
            {row.isInvalid ? "Invalida" : stateMeta[row.effectiveState]?.label}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.isInvalid ? "Debe eliminarse y crearse de nuevo." : `Config: ${stateMeta[row.state]?.label}`}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(row)} disabled={Boolean(row.isInvalid)} />
          <Popconfirm
            title="Eliminar promocion"
            description="Esta accion no se puede deshacer."
            onConfirm={() => handleDelete(row.id)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }} data-tour-id="seller-promotions-root">
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          <Card
            data-tour-id="seller-promotions-hero"
            style={{
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(14,116,144,0.02) 100%)",
            }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Tag color="cyan" bordered={false} style={{ width: "fit-content" }}>
                Promociones por variante
              </Tag>
              <Typography.Title level={2} style={{ margin: 0 }}>
                Rebajas independientes para interno, catalogo o ambos
              </Typography.Title>
              <Typography.Text type="secondary">
                Define precio directo, escalas por cantidad y fechas exactas para cada variante.
              </Typography.Text>
              <Space wrap>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate} data-tour-id="seller-promotions-create-button">
                  Nueva promocion
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
              <Typography.Text strong>Activacion rapida</Typography.Text>
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
          { label: "Solo catalogo", value: summary.catalogo || 0, tone: "#16a34a" },
          { label: "Mixtas", value: summary.ambos || 0, tone: "#7c3aed" },
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

      <Card style={{ marginTop: 16, borderRadius: 24 }} data-tour-id="seller-promotions-filters">
        <Row gutter={[12, 12]} align="middle">
          {isManager ? (
            <Col xs={24} md={8}>
              <Select
                value={selectedSellerId}
                onChange={(value) => setSelectedSellerId(String(value))}
                style={{ width: "100%" }}
                options={sellerOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Selecciona un vendedor"
              />
            </Col>
          ) : null}
          <Col xs={24} md={isManager ? 7 : 10}>
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar por titulo, producto o variante"
              prefix={<EyeOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} md={isManager ? 5 : 7}>
            {!canUseCatalogScopes ? (
              <Tag color="blue" bordered={false} style={{ width: "100%", textAlign: "center", padding: "6px 12px" }}>
                Solo interno
              </Tag>
            ) : (
              <Select
                value={scope}
                onChange={(value) => setScope(value)}
                style={{ width: "100%" }}
                options={scopeOptions}
              />
            )}
          </Col>
          <Col xs={12} md={isManager ? 4 : 7}>
            <Select
              value={state}
              allowClear
              placeholder="Todos los estados"
              onChange={(value) => setState(value)}
              style={{ width: "100%" }}
              options={[
                { value: "draft", label: "Borrador" },
                { value: "active", label: "Activa" },
                { value: "disabled", label: "Deshabilitada" },
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
            },
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
        okText={editingRow ? "Guardar cambios" : "Crear promocion"}
        title={editingRow ? "Editar promocion" : "Nueva promocion"}
        okButtonProps={{ "data-tour-id": "seller-promotions-submit" } as any}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={15}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                scope: canUseCatalogScopes ? "ambos" : "interno",
                state: "active",
                pricingMode: "simple",
                startsDate: dayjs().startOf("day"),
                startsTime: dayjs().startOf("day"),
                endsTime: dayjs().startOf("day"),
                tiers: [{ minQuantity: 3, unitPrice: undefined as unknown as number }],
              }}
            >
              <Form.Item
                data-tour-id="seller-promotions-form-selection"
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
                    label: `${item.displayName} · ${formatMoney(item.basePrice)} · Stock ${item.totalStock}`,
                  }))}
                />
              </Form.Item>

              <Form.Item name="productId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="variantKey" hidden>
                <Input />
              </Form.Item>

              <Row gutter={12} data-tour-id="seller-promotions-form-scope">
                <Col span={12}>
                  {!canUseCatalogScopes ? (
                    <Form.Item name="scope" hidden>
                      <Input />
                    </Form.Item>
                  ) : pricingMode === "conditional" ? (
                    <Form.Item name="scope" hidden>
                      <Input />
                    </Form.Item>
                  ) : (
                    <Form.Item name="scope" label="Aplica a" rules={[{ required: true }]}>
                      <Select options={scopeOptions.filter((option) => option.value !== "all")} />
                    </Form.Item>
                  )}
                </Col>
                <Col span={12}>
                  <Form.Item name="state" label="Estado" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "active", label: "Activa" },
                        { value: "draft", label: "Borrador" },
                        { value: "disabled", label: "Deshabilitada" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="pricingMode" label="Tipo de promocion" rules={[{ required: true }]} data-tour-id="seller-promotions-form-pricing">
                <Radio.Group optionType="button" buttonStyle="solid" onChange={(event) => handlePricingModeChange(event.target.value)}>
                  <Radio.Button value="simple">Precio fijo</Radio.Button>
                  <Radio.Button value="tiers">Por cantidad</Radio.Button>
                  <Radio.Button value="conditional">Condicional</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="title" label="Titulo interno">
                <Input placeholder="Ej. Rebaja de fin de mes" maxLength={90} />
              </Form.Item>

              {pricingMode === "conditional" && (
                <>
                  <Form.Item name="conditionalQuestion" label="Pregunta condicional" rules={[{ required: true, message: "Escribe la pregunta" }]}>
                    <Input placeholder="Ej. ¿Trae envase retornable?" maxLength={120} />
                  </Form.Item>
                  <Form.Item name="scope" hidden>
                    <Input />
                  </Form.Item>
                </>
              )}

              {(pricingMode === "simple" || pricingMode === "conditional") && (
                <Row gutter={12}>
                  <Col span={16}>
                    <Form.Item name="simplePrice" label={pricingMode === "conditional" ? "Precio si responde si" : "Precio fijo promocional"}>
                      <InputNumber min={0} style={{ width: "100%" }} controls={false} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Button style={{ marginTop: 29, width: "100%" }} icon={<GiftOutlined />} onClick={() => void handlePreview()} loading={previewLoading}>
                      Vista previa
                    </Button>
                  </Col>
                </Row>
              )}

              {pricingMode === "tiers" && (
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
                                rules={[{ required: true, message: "Cantidad minima" }]}
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
              )}

              <Row gutter={12} style={{ marginTop: 16 }} data-tour-id="seller-promotions-form-dates">
                <Col span={6}>
                  <Form.Item name="startsDate" label="Inicio fecha" rules={[{ required: true }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="startsTime" label="Inicio hora" rules={[{ required: true }]}>
                    <TimePicker style={{ width: "100%" }} format="HH:mm" minuteStep={5} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="endsDate" label="Fin fecha" rules={[{ required: true }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Elegir fecha" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="endsTime" label="Fin hora" rules={[{ required: true }]}>
                    <TimePicker style={{ width: "100%" }} format="HH:mm" minuteStep={5} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Col>

          <Col xs={24} lg={9}>
            <Card
              data-tour-id="seller-promotions-preview"
              title="Impacto estimado"
              style={{
                borderRadius: 18,
                background: "linear-gradient(180deg, rgba(14,165,233,0.08), rgba(255,255,255,1))",
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
