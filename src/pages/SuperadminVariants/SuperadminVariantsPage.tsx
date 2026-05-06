import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, ReloadOutlined, SaveOutlined, SearchOutlined } from "@ant-design/icons";

import { getSellersBasicAPI } from "../../api/seller";
import {
  deleteSuperadminVariantAPI,
  getSuperadminVariantInventoryPageAPI,
  renameSuperadminVariantAPI,
  updateSuperadminVariantStockAPI,
} from "../../api/product";
import { useMediaQuery } from "../../hooks/useMediaQuery";

import "./SuperadminVariantsPage.css";

type SellerOption = {
  value: string;
  label: string;
  searchText: string;
};

type BranchOption = {
  sucursalId: string;
  sucursalName: string;
};

type BranchStock = {
  sucursalId: string;
  stock: number;
};

type VariantRow = {
  key: string;
  productId: string;
  productName: string;
  variantKey: string;
  variantLabel: string;
  displayName: string;
  categoryName?: string | null;
  totalStock: number;
  variantAttributes: Record<string, string>;
  branchStocks: BranchStock[];
};

type BranchStockCellProps = {
  branch: BranchOption;
  row: VariantRow;
  loading: boolean;
  onSave: (row: VariantRow, branchId: string, stock: number) => Promise<void>;
  onDelete: (row: VariantRow, branchId: string) => Promise<void>;
};

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"];

const BranchStockCell = ({ branch, row, loading, onSave, onDelete }: BranchStockCellProps) => {
  const branchStock = row.branchStocks.find((item) => item.sucursalId === branch.sucursalId);
  const [draftStock, setDraftStock] = useState<number>(Number(branchStock?.stock || 0));

  useEffect(() => {
    setDraftStock(Number(branchStock?.stock || 0));
  }, [branchStock?.stock]);

  if (!branchStock) {
    return (
      <div className="superadmin-variants-branch-cell superadmin-variants-branch-cell-empty">
        <Tag bordered={false}>No está</Tag>
      </div>
    );
  }

  return (
    <div className="superadmin-variants-branch-cell">
      <InputNumber
        min={0}
        precision={0}
        value={draftStock}
        controls={false}
        className="superadmin-variants-stock-input"
        onChange={(value) => setDraftStock(Number(value ?? 0))}
      />
      <div className="superadmin-variants-branch-actions">
        <Button
          size="small"
          type="text"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={() => void onSave(row, branch.sucursalId, draftStock)}
        />
        <Popconfirm
          title={`Eliminar solo en ${branch.sucursalName}?`}
          description="Esta variante se borrará físicamente de esa sucursal."
          okText="Eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => void onDelete(row, branch.sucursalId)}
        >
          <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={loading} />
        </Popconfirm>
      </div>
    </div>
  );
};

const SuperadminVariantsPage = () => {
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>();
  const [sellerName, setSellerName] = useState<string>("");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<VariantRow | null>(null);
  const [editForm] = Form.useForm();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const loadSellers = async () => {
      try {
        const response = await getSellersBasicAPI({ onlyActiveOrRenewal: true });
        const safeSellers = Array.isArray(response) ? response : [];

        setSellerOptions(
          safeSellers
            .map((seller: any) => {
              const label =
                `${String(seller?.nombre || "").trim()} ${String(seller?.apellido || "").trim()}`.trim() ||
                String(seller?.mail || "Vendedor");

              return {
                value: String(seller?._id || ""),
                label,
                searchText: `${label} ${String(seller?.mail || "")}`.toLowerCase(),
              };
            })
            .filter((seller: SellerOption) => seller.value)
        );
      } catch (error) {
        console.error("Error cargando vendedores para superadmin:", error);
        message.error("No se pudieron cargar los vendedores.");
      }
    };

    void loadSellers();
  }, []);

  useEffect(() => {
    const loadRows = async () => {
      if (!selectedSellerId) {
        setRows([]);
        setBranches([]);
        setSellerName("");
        setTotal(0);
        return;
      }

      setLoading(true);
      try {
        const response = await getSuperadminVariantInventoryPageAPI({
          sellerId: selectedSellerId,
          q: debouncedSearch || undefined,
          inStock: onlyInStock ? true : undefined,
          page,
          limit,
          sortOrder,
        });

        const safeRows = Array.isArray(response?.rows) ? response.rows : [];
        const safeBranches = Array.isArray(response?.branches) ? response.branches : [];

        setRows(
          safeRows.map((row: any) => ({
            ...row,
            key: `${row.productId}-${row.variantKey}`,
          }))
        );
        setBranches(
          safeBranches
            .map((branch: any) => ({
              sucursalId: String(branch?.sucursalId || ""),
              sucursalName: String(branch?.sucursalName || "Sucursal"),
            }))
            .filter((branch: BranchOption) => branch.sucursalId)
        );
        setSellerName(String(response?.sellerName || ""));
        setTotal(Number(response?.total || 0));
      } catch (error) {
        console.error("Error cargando variantes del superadmin:", error);
        message.error("No se pudieron cargar las variantes.");
        setRows([]);
        setBranches([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    void loadRows();
  }, [selectedSellerId, debouncedSearch, onlyInStock, page, limit, sortOrder, refreshTick]);

  const refreshData = () => {
    setRefreshTick((current) => current + 1);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setDebouncedSearch("");
    setOnlyInStock(false);
    setSortOrder("asc");
    setPage(1);
    setLimit(20);
  };

  const handleSaveStock = async (row: VariantRow, branchId: string, stock: number) => {
    const key = `stock-${row.key}-${branchId}`;
    setBusyKey(key);
    try {
      const response = await updateSuperadminVariantStockAPI({
        productId: row.productId,
        sellerId: selectedSellerId || "",
        variantKey: row.variantKey,
        sucursalId: branchId,
        stock,
      });

      if (!response?.success) {
        message.error(response?.message || response?.msg || "No se pudo actualizar el stock.");
        return;
      }

      message.success("Stock actualizado.");
      refreshData();
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteBranch = async (row: VariantRow, branchId: string) => {
    const key = `delete-${row.key}-${branchId}`;
    setBusyKey(key);
    try {
      const response = await deleteSuperadminVariantAPI({
        productId: row.productId,
        sellerId: selectedSellerId || "",
        variantKey: row.variantKey,
        sucursalId: branchId,
        scope: "branch",
      });

      if (!response?.success) {
        message.error(response?.message || response?.msg || "No se pudo eliminar la variante.");
        return;
      }

      message.success(response?.message || "Variante eliminada en la sucursal.");
      refreshData();
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteEverywhere = async (row: VariantRow) => {
    const key = `delete-all-${row.key}`;
    setBusyKey(key);
    try {
      const response = await deleteSuperadminVariantAPI({
        productId: row.productId,
        sellerId: selectedSellerId || "",
        variantKey: row.variantKey,
        scope: "all",
      });

      if (!response?.success) {
        message.error(response?.message || response?.msg || "No se pudo eliminar la variante.");
        return;
      }

      message.success(response?.message || "Variante eliminada globalmente.");
      refreshData();
    } finally {
      setBusyKey("");
    }
  };

  const openEditModal = (row: VariantRow) => {
    const branchOptions = row.branchStocks.map((branch) => branch.sucursalId);
    const defaultBranchId = branches.find((branch) => branchOptions.includes(branch.sucursalId))?.sucursalId;

    setEditingRow(row);
    setEditModalOpen(true);
    editForm.setFieldsValue({
      scope: "all",
      sucursalId: defaultBranchId,
      ...row.variantAttributes,
    });
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingRow(null);
    editForm.resetFields();
  };

  const handleSubmitEdit = async () => {
    if (!editingRow || !selectedSellerId) return;

    const values = await editForm.validateFields();
    const nextAttributes = Object.keys(editingRow.variantAttributes).reduce<Record<string, string>>((acc, key) => {
      acc[key] = String(values[key] || "").trim();
      return acc;
    }, {});

    const key = `rename-${editingRow.key}`;
    setBusyKey(key);
    try {
      const response = await renameSuperadminVariantAPI({
        productId: editingRow.productId,
        sellerId: selectedSellerId,
        variantKey: editingRow.variantKey,
        sucursalId: values.scope === "branch" ? values.sucursalId : undefined,
        scope: values.scope,
        variantAttributes: nextAttributes,
      });

      if (!response?.success) {
        message.error(response?.message || response?.msg || "No se pudo actualizar la variante.");
        return;
      }

      message.success("Variante actualizada.");
      closeEditModal();
      refreshData();
    } finally {
      setBusyKey("");
    }
  };

  const branchColumns: ColumnsType<VariantRow> = branches.map((branch) => ({
    title: branch.sucursalName,
    key: `branch-${branch.sucursalId}`,
    width: isMobile ? 150 : 170,
    align: "center",
    render: (_value, row) => (
      <BranchStockCell
        branch={branch}
        row={row}
        loading={busyKey.startsWith(`stock-${row.key}-${branch.sucursalId}`) || busyKey.startsWith(`delete-${row.key}-${branch.sucursalId}`)}
        onSave={handleSaveStock}
        onDelete={handleDeleteBranch}
      />
    ),
  }));

  const columns = useMemo<ColumnsType<VariantRow>>(
    () => [
      {
        title: "Variante",
        dataIndex: "displayName",
        key: "displayName",
        fixed: isMobile ? undefined : "left",
        width: isMobile ? 240 : 320,
        render: (_value, row) => (
          <div className="superadmin-variants-product-cell">
            <div className={`superadmin-variants-stock-dot ${row.totalStock > 0 ? "is-positive" : "is-empty"}`} />
            <div>
              <div className="superadmin-variants-product-title">{row.displayName}</div>
              <div className="superadmin-variants-product-meta">
                {row.categoryName || "Sin categoría"} | Total: {row.totalStock}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Atributos",
        key: "variantAttributes",
        width: isMobile ? 220 : 260,
        render: (_value, row) => (
          <div className="superadmin-variants-attribute-list">
            {Object.entries(row.variantAttributes).map(([key, value]) => (
              <Tag key={`${row.key}-${key}`} className="superadmin-variants-attribute-tag" bordered={false}>
                <strong>{key}:</strong> {value}
              </Tag>
            ))}
          </div>
        ),
      },
      ...branchColumns,
      {
        title: "Acciones",
        key: "actions",
        fixed: isMobile ? undefined : "right",
        width: isMobile ? 130 : 140,
        align: "center",
        render: (_value, row) => (
          <Space direction="vertical" size={8}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(row)} size="small">
              Editar
            </Button>
            <Popconfirm
              title="Eliminar la variante en todas las sucursales?"
              description="El borrado es físico y puede eliminar el producto si era su última variante."
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDeleteEverywhere(row)}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={busyKey === `delete-all-${row.key}`}
              >
                Borrar todo
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [branchColumns, busyKey, isMobile]
  );

  const tableScrollX = useMemo(
    () => (isMobile ? 240 : 320) + (isMobile ? 220 : 260) + branches.length * (isMobile ? 150 : 170) + (isMobile ? 130 : 140),
    [branches.length, isMobile]
  );

  const activeBranchOptions = useMemo(() => {
    if (!editingRow) return [];

    const branchIds = new Set(editingRow.branchStocks.map((branch) => branch.sucursalId));
    return branches.filter((branch) => branchIds.has(branch.sucursalId));
  }, [branches, editingRow]);

  return (
    <div className="superadmin-variants-page p-4">
      <div className="superadmin-variants-header">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Control global de variantes
          </Typography.Title>
          <Typography.Text type="secondary">
            Gestiona stock, nombres y borrado físico por vendedor y sucursal.
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
          Limpiar filtros
        </Button>
      </div>

      <div className="superadmin-variants-top-grid">
        <Card className="superadmin-variants-filter-card">
          <div className="superadmin-variants-filter-grid">
            <Select
              size="large"
              value={selectedSellerId}
              onChange={(value) => {
                setSelectedSellerId(value);
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

            <Input
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Buscar producto o variante..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              allowClear
              disabled={!selectedSellerId}
            />

            <Select
              size="large"
              value={sortOrder}
              onChange={(value) => {
                setSortOrder(value);
                setPage(1);
              }}
              disabled={!selectedSellerId}
              options={[
                { value: "asc", label: "Nombre A-Z" },
                { value: "desc", label: "Nombre Z-A" },
              ]}
            />
          </div>

          <div className="superadmin-variants-toggle-row">
            <Space>
              <span>Solo con stock</span>
              <Switch
                checked={onlyInStock}
                onChange={(checked) => {
                  setOnlyInStock(checked);
                  setPage(1);
                }}
                disabled={!selectedSellerId}
              />
            </Space>
          </div>
        </Card>

        <Card className="superadmin-variants-summary-card">
          <div className="superadmin-variants-summary-title">Resumen</div>
          <div className="superadmin-variants-summary-value">{total}</div>
          <div className="superadmin-variants-summary-caption">
            {sellerName ? `Variantes visibles de ${sellerName}` : "Selecciona un vendedor para empezar"}
          </div>
          <div className="superadmin-variants-summary-badges">
            <Tag color="blue">Sucursales: {branches.length}</Tag>
            <Tag color="green">Página: {page}</Tag>
          </div>
        </Card>
      </div>

      {!selectedSellerId && (
        <Alert
          type="info"
          showIcon
          message="Selecciona un vendedor para cargar sus variantes y administrar stock por sucursal."
          style={{ marginBottom: 16 }}
        />
      )}

      <Card className="superadmin-variants-table-card">
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: Math.max(tableScrollX, isMobile ? 980 : 1200) }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  selectedSellerId
                    ? "No hay variantes para los filtros actuales."
                    : "Selecciona un vendedor para ver las variantes."
                }
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
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setLimit(nextPageSize || 20);
            },
          }}
        />
      </Card>

      <Modal
        open={editModalOpen}
        title="Editar nombre de variante"
        okText="Guardar cambios"
        cancelText="Cancelar"
        confirmLoading={busyKey.startsWith("rename-")}
        onOk={() => void handleSubmitEdit()}
        onCancel={closeEditModal}
      >
        {editingRow && (
          <Form form={editForm} layout="vertical">
            <div className="superadmin-variants-edit-summary">
              <div className="superadmin-variants-edit-title">{editingRow.displayName}</div>
              <div className="superadmin-variants-edit-subtitle">
                Elige si el cambio aplica a una sucursal o a todas.
              </div>
            </div>

            <Form.Item name="scope" label="Alcance" rules={[{ required: true, message: "Selecciona el alcance" }]}>
              <Radio.Group optionType="button" buttonStyle="solid">
                <Radio.Button value="all">Todas las sucursales</Radio.Button>
                <Radio.Button value="branch">Solo una sucursal</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) =>
                getFieldValue("scope") === "branch" ? (
                  <Form.Item
                    name="sucursalId"
                    label="Sucursal"
                    rules={[{ required: true, message: "Selecciona la sucursal" }]}
                  >
                    <Select
                      options={activeBranchOptions.map((branch) => ({
                        value: branch.sucursalId,
                        label: branch.sucursalName,
                      }))}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            {Object.entries(editingRow.variantAttributes).map(([key]) => (
              <Form.Item
                key={key}
                name={key}
                label={key}
                rules={[{ required: true, message: `Completa ${key}` }]}
              >
                <Input size="large" />
              </Form.Item>
            ))}
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default SuperadminVariantsPage;
