import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { getActionTraceActorsAPI, getActionTracesAPI } from "../../api/actionTrace";
import {
  ACTION_TRACE_ACTION_OPTIONS,
  ACTION_TRACE_CATEGORY_OPTIONS,
  getActionTracePresentation,
  getActionTypesByCategory,
} from "./actionTracePresentation";

type ActionTraceRow = {
  _id: string;
  actionType: string;
  sourceModule: string;
  sourceId?: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string;
  actorUserId?: string | null;
  actorRole?: string;
  actorName?: string;
  sellerId?: string | null;
  sellerName?: string;
  branchId?: string | null;
  branchName?: string;
  status: "success" | "failed";
  failureCategory?: string;
  failureMessage?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

type ActorOption = {
  actorUserId: string;
  actorName?: string;
  actorRole?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "success", label: "Exitosos" },
  { value: "failed", label: "Fallidos" },
];

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: string) => (status === "failed" ? "red" : "green");

const ActionTraceModal = ({ open, onClose }: Props) => {
  const [rows, setRows] = useState<ActionTraceRow[]>([]);
  const [actorOptions, setActorOptions] = useState<ActorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingActors, setLoadingActors] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("all");
  const [categoryKey, setCategoryKey] = useState<string | undefined>();
  const [selectedActionType, setSelectedActionType] = useState<string | undefined>();
  const [selectedActorUserId, setSelectedActorUserId] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  useEffect(() => {
    if (!open) {
      setPage(1);
      return;
    }

    const timeout = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [open, q]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await getActionTracesAPI({
          page,
          limit,
          status,
          actionType: selectedActionType,
          actionTypes: !selectedActionType && categoryKey ? getActionTypesByCategory(categoryKey).join(",") : undefined,
          actorUserId: selectedActorUserId,
          q: debouncedQ,
          from: dateRange?.[0]?.toISOString(),
          to: dateRange?.[1]?.toISOString(),
          order: "desc",
        });

        if (!mounted) return;
        setRows(Array.isArray(response?.rows) ? response.rows : []);
        setTotal(Number(response?.total || 0));
      } catch (error) {
        if (!mounted) return;
        console.error(error);
        message.error("No se pudo cargar la trazabilidad");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [open, page, limit, status, categoryKey, selectedActionType, selectedActorUserId, debouncedQ, dateRange]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const loadActors = async () => {
      setLoadingActors(true);
      try {
        const response = await getActionTraceActorsAPI();
        if (!mounted) return;
        setActorOptions(Array.isArray(response?.rows) ? response.rows : []);
      } catch (error) {
        if (!mounted) return;
        console.error(error);
        message.error("No se pudieron cargar los usuarios de trazabilidad");
      } finally {
        if (mounted) setLoadingActors(false);
      }
    };

    void loadActors();
    return () => {
      mounted = false;
    };
  }, [open]);

  const actionOptions = useMemo(
    () => ACTION_TRACE_ACTION_OPTIONS.find((item) => item.categoryKey === categoryKey)?.actions || [],
    [categoryKey]
  );

  const actorSelectOptions = useMemo(
    () =>
      actorOptions.map((actor) => {
        const actorName = String(actor.actorName || "").trim();
        const actorRole = String(actor.actorRole || "").trim();
        const label = actorRole ? `${actorName || actor.actorUserId} (${actorRole})` : actorName || actor.actorUserId;
        return {
          value: actor.actorUserId,
          label,
        };
      }),
    [actorOptions]
  );

  const columns: ColumnsType<ActionTraceRow> = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "createdAt",
        width: 180,
        render: (value) => formatDateTime(value),
      },
      {
        title: "Estado",
        dataIndex: "status",
        width: 110,
        render: (value) => <Tag color={getStatusColor(value)}>{value === "failed" ? "Fallido" : "Exitoso"}</Tag>,
      },
      {
        title: "Categoría",
        width: 160,
        render: (_, row) => getActionTracePresentation(row).categoryLabel,
      },
      {
        title: "Acción",
        width: 220,
        render: (_, row) => getActionTracePresentation(row).actionLabel,
      },
      {
        title: "Resumen",
        dataIndex: "summary",
        width: 320,
      },
      {
        title: "Usuario",
        width: 220,
        render: (_, row) => row.actorName || row.actorRole || "Sistema",
      },
      {
        title: "Área del sistema",
        width: 180,
        render: (_, row) => getActionTracePresentation(row).moduleLabel,
      },
      {
        title: "Tipo de registro",
        width: 180,
        render: (_, row) => row.entityLabel || getActionTracePresentation(row).entityLabel || row.sourceId || "-",
      },
      {
        title: "Error",
        width: 220,
        render: (_, row) => (row.status === "failed" ? row.failureCategory || row.failureMessage || "-" : "-"),
      },
    ],
    []
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={1320} title="Trazabilidad" destroyOnClose>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Consulta ventas, entregas, entradas, salidas, ingresos y gastos con filtros por acción y usuario.
        </Typography.Text>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Buscar por resumen, usuario o registro"
              onSearch={(value) => {
                setQ(value);
                setPage(1);
              }}
              onChange={(e) => setQ(e.target.value)}
              value={q}
              style={{ width: 260 }}
            />
            <Select
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              style={{ width: 150 }}
            />
            <Select
              allowClear
              placeholder="Categoría"
              value={categoryKey}
              onChange={(value) => {
                setCategoryKey(value);
                setSelectedActionType(undefined);
                setPage(1);
              }}
              options={ACTION_TRACE_CATEGORY_OPTIONS}
              style={{ width: 170 }}
            />
            <Select
              allowClear
              placeholder="Acción"
              value={selectedActionType}
              onChange={(value) => {
                setSelectedActionType(value);
                setPage(1);
              }}
              options={actionOptions}
              disabled={!categoryKey}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Usuario"
              value={selectedActorUserId}
              onChange={(value) => {
                setSelectedActorUserId(value);
                setPage(1);
              }}
              options={actorSelectOptions}
              loading={loadingActors}
              style={{ width: 260 }}
            />
            <RangePicker
              value={dateRange as any}
              onChange={(value) => {
                setDateRange(value as any);
                setPage(1);
              }}
              placeholder={["Fecha inicial", "Fecha final"]}
            />
          </Space>
          <Button
            onClick={() => {
              setPage(1);
              setQ("");
              setDebouncedQ("");
              setStatus("all");
              setCategoryKey(undefined);
              setSelectedActionType(undefined);
              setSelectedActorUserId(undefined);
              setDateRange(null);
            }}
          >
            Limpiar filtros
          </Button>
        </Space>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextLimit) => {
              setPage(nextPage);
              setLimit(Number(nextLimit || 20));
            },
          }}
          scroll={{ x: 1600 }}
        />
      </Space>
    </Modal>
  );
};

export default ActionTraceModal;
