import { useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Image,
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
  EditOutlined,
  FileImageOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { getSellerProductInfoPageAPI } from "../../api/product";
import { getCategoriesAPI } from "../../api/category";
import { getSellerAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";

import "./SellerProductInfoPage.css";

type SellerBranchOption = {
  value: string;
  label: string;
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
  imagenes?: { url: string; key?: string }[];
  imagenesCount?: number;
  hasImages?: boolean;
  hasDescription?: boolean;
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
  const hasImages = Number(row.imagenesCount || 0) > 0;
  const hasAnyPromotionData =
    hasText(row.promocionTitulo) ||
    hasText(row.promocionDescripcion) ||
    hasDate(row.promocionFechaInicio) ||
    hasDate(row.promocionFechaFin);

  if (!hasDescription && !hasImages && !hasAnyPromotionData) return "empty";
  if (hasDescription && hasImages) return "complete";
  return "partial";
};

const getCompletionLabel = (row: SellerProductInfoRow) => {
  const status = getCompletionStatus(row);
  if (status === "empty") return "Sin completar";
  if (status === "partial") return "Incompleto";
  return "Completo";
};

const SellerProductInfoPage = () => {
  const { user } = useContext(UserContext);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SellerProductInfoRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<SellerBranchOption[]>([]);
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
        const [categoriesResponse, sellerResponse] = await Promise.all([
          getCategoriesAPI(),
          user?.id_vendedor ? getSellerAPI(user.id_vendedor) : Promise.resolve(null),
        ]);

        setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);

        const sellerBranches = Array.isArray(sellerResponse?.pago_sucursales)
          ? sellerResponse.pago_sucursales.map((branch: any) => ({
              value: String(branch?.id_sucursal?._id || branch?.id_sucursal || ""),
              label: String(branch?.sucursalName || branch?.id_sucursal?.nombre || "Sucursal"),
            }))
          : [];

        setBranches(sellerBranches.filter((branch) => branch.value));
      } catch (error) {
        console.error("Error al cargar filtros de informacion de productos:", error);
        message.error("No se pudieron cargar las opciones de filtros.");
      }
    };

    void loadFiltersData();
  }, [user?.id_vendedor]);

  useEffect(() => {
    const loadProductInfo = async () => {
      setLoading(true);
      try {
        const response = await getSellerProductInfoPageAPI({
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
        });

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
      children: [
        {
          title: "Titulo",
          dataIndex: "promocionTitulo",
          key: "promocionTitulo",
          width: 180,
          render: (value) =>
            value || (
              <Tag bordered={false} color="default">
                Sin titulo
              </Tag>
            ),
        },
        {
          title: "Descripcion",
          dataIndex: "promocionDescripcion",
          key: "promocionDescripcion",
          width: 220,
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
          title: "Fecha Inicio",
          dataIndex: "promocionFechaInicio",
          key: "promocionFechaInicio",
          width: 140,
          render: (value) => formatDate(value),
        },
        {
          title: "Fecha Fin",
          dataIndex: "promocionFechaFin",
          key: "promocionFechaFin",
          width: 140,
          render: (value) => formatDate(value),
        },
      ],
    },
    {
      title: "Actualizar",
      key: "actions",
      width: 110,
      fixed: "right",
      align: "center",
      render: () => (
        <Tooltip title="Edicion disponible en el siguiente paso">
          <Button
            icon={<EditOutlined />}
            onClick={() => message.info("La edicion se agrega en el siguiente paso.")}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="seller-product-info-page p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/box-icon.png" alt="Informacion Productos" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            Informacion Productos
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
              placeholder="Buscar producto, variante o promocion..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              allowClear
              size="large"
            />

            <Select
              size="large"
              value={selectedBranch}
              onChange={(value) => {
                setSelectedBranch(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Todas las sucursales" }, ...branches]}
            />

            <Select
              size="large"
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setPage(1);
              }}
              options={[{ value: "all", label: "Todas las categorias" }, ...categoryOptions]}
            />
          </div>

          <div className="seller-product-info-toggle-row">
            <Space>
              <span>Solo con stock</span>
              <Switch
                checked={filterInStock}
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
                onChange={(checked) => {
                  setFilterHasPromotion(checked);
                  setPage(1);
                }}
              />
            </Space>
            <Space>
              <span>Con imagenes</span>
              <Switch
                checked={filterHasImages}
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
                  <span>Variante con stock disponible</span>
                </div>
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-dot seller-product-info-dot-red" />
                  <span>Variante sin stock disponible</span>
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
                  <span>Amarillo: tiene algo cargado, pero le falta descripcion o imagenes</span>
                </div>
                <div className="seller-product-info-legend-item">
                  <span className="seller-product-info-swatch seller-product-info-swatch-green" />
                  <span>Verde: ya tiene descripcion e imagenes; promocion es opcional</span>
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
          scroll={{ x: 1500 }}
          rowClassName={(record) => `seller-product-info-row-${getCompletionStatus(record)}`}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                description="No hay variantes que coincidan con los filtros actuales."
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {selectedImages.map((image, index) => (
              <Card key={`${image.key || image.url}-${index}`} bodyStyle={{ padding: 12 }}>
                <Image
                  src={image.url}
                  alt={`Imagen variante ${index + 1}`}
                  style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="No hay imagenes para mostrar." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Modal>
    </div>
  );
};

export default SellerProductInfoPage;
