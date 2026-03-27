import { useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  FileImageOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { getAdminSellerProductInfoPageAPI, getSellerProductInfoPageAPI } from "../../api/product";
import { getCategoriesAPI } from "../../api/category";
import { getSellerAPI, getSellersBasicAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import SellerProductInfoEditModal from "./SellerProductInfoEditModal";
import infoProductIcon from "../../assets/infoProductIcon.svg";

import "./SellerProductInfoPage.css";

type SellerBranchOption = {
  value: string;
  label: string;
};

type SellerOption = {
  value: string;
  label: ReactNode;
  searchText: string;
  status: CompletionStatus;
};

type CategoryOption = {
  _id: string;
  categoria: string;
};

type SellerProductInfoRow = {
  key: string;
  productId: string;
  variantKey: string;
  displayName: string;
  nombreProducto: string;
  variantLabel?: string | null;
  descripcion?: string | null;
  uso?: string | null;
  imagenes?: { url: string; key?: string }[];
  imagenesCount?: number;
  hasImages?: boolean;
  hasDescription?: boolean;
  hasUsage?: boolean;
  hasPromotion?: boolean;
  promocionTitulo?: string | null;
  promocionDescripcion?: string | null;
  promocionFechaInicio?: string | null;
  promocionFechaFin?: string | null;
  representativeSucursalId?: string;
  totalStock?: number;
  categoryName?: string;
};

type CompletionStatus = "empty" | "partial" | "complete";

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"];

const hasText = (value?: string | null) => String(value || "").trim().length > 0;

const hasDate = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const formatDate = (value?: string | null) => {
  if (!hasDate(value)) return "Sin fecha";
  return new Date(String(value)).toLocaleDateString("es-BO");
};

const getCompletionStatus = (row: SellerProductInfoRow): CompletionStatus => {
  const hasDescription = hasText(row.descripcion);
  const hasUsage = hasText(row.uso);
  const hasImages = Number(row.imagenesCount || 0) > 0;
  const hasAnyPromotionData =
    hasText(row.promocionTitulo) ||
    hasText(row.promocionDescripcion) ||
    hasDate(row.promocionFechaInicio) ||
    hasDate(row.promocionFechaFin);

  if (!hasDescription && !hasUsage && !hasImages && !hasAnyPromotionData) return "empty";
  if (hasDescription && hasImages) return "complete";
  return "partial";
};

const getSellerProductInfoStatusMeta = (status?: string) => {
  switch (status) {
    case "complete":
      return { color: "green" as const, label: "Completo" };
    case "partial":
      return { color: "gold" as const, label: "Incompleto" };
    case "empty":
    default:
      return { color: "red" as const, label: "Sin informacion" };
  }
};

type SellerProductInfoPageProps = {
  mode?: "seller" | "admin";
};

const SellerProductInfoPage = ({ mode = "seller" }: SellerProductInfoPageProps) => {
  const { user } = useContext(UserContext);
  const isAdminMode = mode === "admin";
  const isReadOnly = isAdminMode;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SellerProductInfoRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<SellerBranchOption[]>([]);
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterHasPromotion, setFilterHasPromotion] = useState(false);
  const [filterHasImages, setFilterHasImages] = useState(false);
  const [filterHasDescription, setFilterHasDescription] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ url: string; key?: string }[]>([]);
  const [selectedImagesTitle, setSelectedImagesTitle] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SellerProductInfoRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [expandedPromotionKeys, setExpandedPromotionKeys] = useState<Array<string | number>>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [categoriesResponse, sellersResponse] = await Promise.all([
          getCategoriesAPI(),
          isAdminMode
            ? getSellersBasicAPI({
                onlyProductInfoAccess: true,
                includeProductInfoStatus: true,
              })
            : Promise.resolve([]),
        ]);

        setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);
        if (isAdminMode) {
          const nextSellerOptions = (Array.isArray(sellersResponse) ? sellersResponse : [])
            .map((seller: any) => {
              const sellerName =
                `${String(seller?.nombre || "").trim()} ${String(seller?.apellido || "").trim()}`.trim() ||
                String(seller?.mail || "Vendedor");
              const sellerStatus = getSellerProductInfoStatusMeta(seller?.product_info_status);

              return {
                value: String(seller?._id || ""),
                label: (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{sellerName}</span>
                    <Tag color={sellerStatus.color} bordered={false} style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                      {sellerStatus.label}
                    </Tag>
                  </div>
                ),
                searchText: `${sellerName} ${String(seller?.mail || "")} ${sellerStatus.label}`.toLowerCase(),
                status:
                  seller?.product_info_status === "complete" || seller?.product_info_status === "partial"
                    ? seller.product_info_status
                    : "empty",
              };
            })
            .filter((seller: SellerOption) => seller.value);
          setSellerOptions(nextSellerOptions);
        }
      } catch (error) {
        console.error("Error al cargar filtros de informacion de productos:", error);
        message.error("No se pudieron cargar las opciones de filtros.");
      }
    };

    void loadFiltersData();
  }, [isAdminMode]);

  useEffect(() => {
    const targetSellerId = isAdminMode ? selectedSellerId : user?.id_vendedor;
    if (!targetSellerId) {
      setBranches([]);
      return;
    }

    const loadSellerBranches = async () => {
      try {
        const sellerResponse = await getSellerAPI(String(targetSellerId));
        const sellerBranches = Array.isArray(sellerResponse?.pago_sucursales)
          ? sellerResponse.pago_sucursales.map((branch: any) => ({
              value: String(branch?.id_sucursal?._id || branch?.id_sucursal || ""),
              label: String(branch?.sucursalName || branch?.id_sucursal?.nombre || "Sucursal"),
            }))
          : [];

        setBranches(sellerBranches.filter((branch) => branch.value));
      } catch (error) {
        console.error("Error al cargar sucursales del vendedor:", error);
        setBranches([]);
      }
    };

    void loadSellerBranches();
  }, [isAdminMode, selectedSellerId, user?.id_vendedor]);

  useEffect(() => {
    const loadProductInfo = async () => {
      if (isAdminMode && !selectedSellerId) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const requestParams = {
          sucursalId: selectedBranch !== "all" ? selectedBranch : undefined,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
          q: debouncedSearch || undefined,
          inStock: filterInStock ? true : undefined,
          hasPromotion: filterHasPromotion ? true : undefined,
          hasImages: filterHasImages ? true : undefined,
          hasDescription: filterHasDescription ? true : undefined,
          page,
          limit,
          sortOrder,
        };
        const response = isAdminMode
          ? await getAdminSellerProductInfoPageAPI({
              sellerId: String(selectedSellerId),
              ...requestParams,
            })
          : await getSellerProductInfoPageAPI(requestParams);

        const safeRows = Array.isArray(response?.rows) ? response.rows : [];
        setRows(
          safeRows.map((row: any, index: number) => ({
            ...row,
            key: row?.variantKey
              ? `${row.productId}-${row.variantKey}`
              : `${row.productId}-${row.representativeSucursalId || index}`,
          }))
        );
        setTotal(Number(response?.total || 0));
      } catch (error) {
        console.error("Error al cargar informacion de productos:", error);
        message.error("No se pudo cargar la informacion de productos.");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    void loadProductInfo();
  }, [
    isAdminMode,
    selectedSellerId,
    selectedBranch,
    selectedCategory,
    debouncedSearch,
    filterInStock,
    filterHasPromotion,
    filterHasImages,
    filterHasDescription,
    page,
    limit,
    sortOrder,
    refreshTick,
  ]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category._id),
        label: category.categoria,
      })),
    [categories]
  );

  const statusSummary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const status = getCompletionStatus(row);
        acc[status] += 1;
        return acc;
      },
      { empty: 0, partial: 0, complete: 0 } as Record<CompletionStatus, number>
    );
  }, [rows]);

  const handleResetFilters = () => {
    setSearchText("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedBranch("all");
    setSortOrder("asc");
    setFilterInStock(false);
    setFilterHasPromotion(false);
    setFilterHasImages(false);
    setFilterHasDescription(false);
    setPage(1);
    setLimit(10);
  };

  const handleOpenImages = (record: SellerProductInfoRow) => {
    const images = Array.isArray(record.imagenes) ? record.imagenes.filter((image) => image?.url) : [];
    if (!images.length) {
      message.info("Esta variante no tiene imagenes registradas.");
      return;
    }

    setSelectedImages(images);
    setSelectedImagesTitle(record.displayName || record.nombreProducto || "Imagenes de variante");
    setImageModalOpen(true);
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, (string | number | boolean)[] | null>,
    sorter: SorterResult<SellerProductInfoRow> | SorterResult<SellerProductInfoRow>[]
  ) => {
    setPage(pagination.current || 1);
    setLimit(pagination.pageSize || 10);

    if (!Array.isArray(sorter) && sorter?.columnKey === "displayName") {
      if (sorter.order === "descend") {
        setSortOrder("desc");
      } else {
        setSortOrder("asc");
      }
    }
  };

  const togglePromotionRow = (rowKey: string | number) => {
    setExpandedPromotionKeys((current) =>
      current.includes(rowKey) ? current.filter((key) => key !== rowKey) : [...current, rowKey]
    );
  };

  const columns: ColumnsType<SellerProductInfoRow> = [
    {
      title: "Producto",
      dataIndex: "displayName",
      key: "displayName",
      width: 360,
      sorter: true,
      sortOrder: sortOrder === "asc" ? "ascend" : "descend",
      render: (_value, record) => {
        const hasStock = Number(record.totalStock || 0) > 0;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className={`w-4 h-4 rounded-full ${hasStock ? "bg-green-500" : "bg-red-500"}`}
              style={{ flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{record.displayName}</div>
              <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 2 }}>
                {record.categoryName || "Sin categoria"} | Stock total: {Number(record.totalStock || 0)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Descripcion",
      dataIndex: "descripcion",
      key: "descripcion",
      width: 260,
      render: (value) =>
        value ? (
          <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3 }}>
            {value}
          </Typography.Paragraph>
        ) : (
          <Tag bordered={false} color="default">
            Sin descripcion
          </Tag>
        ),
    },
    {
      title: "Uso",
      dataIndex: "uso",
      key: "uso",
      width: 260,
      render: (value) =>
        value ? (
          <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3 }}>
            {value}
          </Typography.Paragraph>
        ) : (
          <Tag bordered={false} color="default">
            Sin uso
          </Tag>
        ),
    },
    {
      title: "Imagenes",
      dataIndex: "imagenesCount",
      key: "imagenesCount",
      width: 140,
      align: "center",
      render: (_value, record) => (
        <Tooltip title={record.hasImages ? "Ver imagenes" : "Sin imagenes"}>
          <Button
            icon={<FileImageOutlined />}
            onClick={() => handleOpenImages(record)}
            disabled={!record.hasImages}
          >
            {record.imagenesCount || 0}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Promocion",
      key: "promocion",
      width: 200,
      render: (_value, record) => {
        if (!record.hasPromotion) {
          return (
            <Tag bordered={false} color="default">
              Sin promocion
            </Tag>
          );
        }

        const expanded = expandedPromotionKeys.includes(record.key);

        return (
          <Button
            type="text"
            className="seller-product-info-promotion-toggle"
            onClick={() => togglePromotionRow(record.key)}
          >
            <Space size={8}>
              {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0 }}>
                Tiene promocion
              </Tag>
            </Space>
          </Button>
        );
      },
    },
  ];

  if (!isReadOnly) {
    columns.push({
      title: "Actualizar",
      key: "actions",
      width: 110,
      fixed: "right",
      align: "center",
      render: (_value, record) => (
        <Tooltip title="Editar informacion">
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              setEditModalOpen(true);
            }}
          />
        </Tooltip>
      ),
    });
  }

  return (
    <div className="seller-product-info-page p-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src={infoProductIcon} alt="Informacion Productos" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            Información Productos
          </h1>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
            Limpiar filtros
          </Button>
        </Space>
      </div>

      <div className="seller-product-info-top-grid">
        <Card className="seller-product-info-filters seller-product-info-filters-compact" style={{ marginBottom: 16 }}>
          <div className="seller-product-info-filters-grid">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Buscar producto, descripcion, uso o promocion..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              allowClear
              size="large"
            />

            {isAdminMode && (
              <Select
                size="large"
                value={selectedSellerId}
                onChange={(value) => {
                  setSelectedSellerId(value);
                  setSelectedBranch("all");
                  setPage(1);
                }}
                options={sellerOptions}
                placeholder="Selecciona un vendedor"
                showSearch
                allowClear
                filterOption={(input, option) =>
                  String((option as SellerOption | undefined)?.searchText || "").includes(input.toLowerCase())
                }
              />
            )}

            <Select
              size="large"
              value={selectedBranch}
              onChange={(value) => {
                setSelectedBranch(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Todas las sucursales" }, ...branches]}
              disabled={isAdminMode && !selectedSellerId}
            />

            <Select
              size="large"
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Todas las categorias" }, ...categoryOptions]}
              disabled={isAdminMode && !selectedSellerId}
            />
          </div>

          {isAdminMode && !selectedSellerId && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 16 }}
              message="Selecciona un vendedor para cargar sus productos."
            />
          )}

          <div className="seller-product-info-toggle-row">
            <Space>
              <span>Solo con stock</span>
              <Switch
                checked={filterInStock}
                disabled={isAdminMode && !selectedSellerId}
                onChange={(checked) => {
                  setFilterInStock(checked);
                  setPage(1);
                }}
              />
            </Space>
            <Space>
              <span>Con promocion</span>
              <Switch
                checked={filterHasPromotion}
                disabled={isAdminMode && !selectedSellerId}
                onChange={(checked) => {
                  setFilterHasPromotion(checked);
                  setPage(1);
                }}
              />
            </Space>
            <Space>
              <span>Con imágenes</span>
              <Switch
                checked={filterHasImages}
                disabled={isAdminMode && !selectedSellerId}
                onChange={(checked) => {
                  setFilterHasImages(checked);
                  setPage(1);
                }}
              />
            </Space>
            <Space>
              <span>Con descripcion</span>
              <Switch
                checked={filterHasDescription}
                disabled={isAdminMode && !selectedSellerId}
                onChange={(checked) => {
                  setFilterHasDescription(checked);
                  setPage(1);
                }}
              />
            </Space>
          </div>
        </Card>

        <Card className="seller-product-info-legend-card seller-product-info-legend-card-compact" size="small" style={{ marginBottom: 16 }}>
          <div className="seller-product-info-legend-grid">
            <div className="seller-product-info-legend-section">
              <div className="seller-product-info-legend-title">Estado de stock</div>
              <div className="seller-product-info-legend-list">
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-dot seller-product-info-dot-green" />
                  <span>Stock disponible</span>
                </div>
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-dot seller-product-info-dot-red" />
                  <span>Sin stock disponible</span>
                </div>
              </div>
            </div>

            <div className="seller-product-info-legend-section">
              <div className="seller-product-info-legend-title">Nivel de informacion</div>
              <div className="seller-product-info-legend-list">
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-swatch seller-product-info-swatch-red" />
                  <span>Rojo: no tiene descripcion ni imagenes cargadas</span>
                </div>
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-swatch seller-product-info-swatch-yellow" />
                  <span>Amarillo: le falta descripcion o imagenes</span>
                </div>
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-swatch seller-product-info-swatch-green" />
                  <span>Verde: completo (uso y promocion son opcionales)</span>
                </div>
              </div>
              <div className="seller-product-info-legend-summary">
                <Tag color="red">Sin completar: {statusSummary.empty}</Tag>
                <Tag color="gold">Incompleto: {statusSummary.partial}</Tag>
                <Tag color="green">Completo: {statusSummary.complete}</Tag>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="seller-product-info-table-card">
        <Table
          rowKey="key"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1280 }}
          rowClassName={(record) => `seller-product-info-row-${getCompletionStatus(record)}`}
          onChange={handleTableChange}
          expandable={{
            expandedRowKeys: expandedPromotionKeys,
            rowExpandable: (record) => Boolean(record.hasPromotion),
            showExpandColumn: false,
            expandedRowRender: (record) => (
              <div className="seller-product-info-promotion-panel">
                <div className="seller-product-info-promotion-grid">
                  <div className="seller-product-info-promotion-item">
                    <span className="seller-product-info-promotion-label">Titulo</span>
                    <span>{record.promocionTitulo || "Sin titulo"}</span>
                  </div>
                  <div className="seller-product-info-promotion-item">
                    <span className="seller-product-info-promotion-label">Fecha inicio</span>
                    <span>{formatDate(record.promocionFechaInicio)}</span>
                  </div>
                  <div className="seller-product-info-promotion-item">
                    <span className="seller-product-info-promotion-label">Descripcion</span>
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      {record.promocionDescripcion || "Sin descripcion"}
                    </Typography.Paragraph>
                  </div>
                  <div className="seller-product-info-promotion-item">
                    <span className="seller-product-info-promotion-label">Fecha fin</span>
                    <span>{formatDate(record.promocionFechaFin)}</span>
                  </div>
                </div>
              </div>
            ),
            onExpandedRowsChange: (keys) => setExpandedPromotionKeys(keys),
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  isAdminMode && !selectedSellerId
                    ? "Selecciona un vendedor para ver sus variantes."
                    : "No hay variantes que coincidan con los filtros actuales."
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (value) => `${value} variante(s)`,
          }}
        />
      </Card>

      <Modal
        open={imageModalOpen}
        onCancel={() => {
          setImageModalOpen(false);
          setSelectedImages([]);
          setSelectedImagesTitle("");
        }}
        footer={null}
        title={selectedImagesTitle || "Imagenes de la variante"}
        width={900}
      >
        {selectedImages.length ? (
          <div className="seller-product-info-image-modal-layout">
            <div className="seller-product-info-image-modal-main">
              <div className="seller-product-info-image-modal-badge">Principal</div>
              <img
                src={selectedImages[0]?.url}
                alt="Imagen principal"
                className="seller-product-info-image-modal-main-img"
              />
            </div>

            <div className="seller-product-info-image-modal-side">
              {selectedImages.slice(1, 4).map((image, index) => (
                <Card
                  key={`${image.key || image.url}-${index}`}
                  bodyStyle={{ padding: 8 }}
                  className="seller-product-info-image-modal-side-card"
                >
                  <img
                    src={image.url}
                    alt={`Imagen secundaria ${index + 1}`}
                    className="seller-product-info-image-modal-side-img"
                  />
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Empty description="No hay imagenes para mostrar." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Modal>

      {!isReadOnly && (
        <SellerProductInfoEditModal
          visible={editModalOpen}
          record={editingRecord}
          onClose={() => {
            setEditModalOpen(false);
            setEditingRecord(null);
          }}
          onSuccess={async () => {
            setRefreshTick((current) => current + 1);
          }}
        />
      )}
    </div>
  );
};

export default SellerProductInfoPage;
