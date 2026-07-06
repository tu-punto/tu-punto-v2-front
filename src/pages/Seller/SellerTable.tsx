import {
  Button,
  Empty,
  Grid,
  Input,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PayDebtButton from "./components/PayDebtButton";
import DebtModal from "./DebtModal";
import SellerInfoModalTry from "./SellerInfoModal";
import SucursalDrawer from "./components/SucursalDrawer";
import DeclineServiceReasonModal from "../../components/DeclineServiceReasonModal";

import {
  adminDeclineSellerServiceAPI,
  cancelSellerServiceDeclineAPI,
  getSellersAPI,
} from "../../api/seller";

import { ISeller, ISucursalPago } from "../../models/sellerModels";

type SellerRow = ISeller & {
  key: string;
  pagoTotal: string;
  pagoTotalInt: number;
  pago_mensual: string;
  fecha_pago_asignada_label: string;
};

type SellerListResponse = {
  data: ISeller[];
  total: number;
  page: number;
  pageSize: number;
  totalPendingPayment: number;
};

type SellerSortBy =
  | "nombre"
  | "estado"
  | "pago_pendiente"
  | "fecha_vigencia"
  | "fecha_pago_asignada"
  | "pago_mensual"
  | "comision_porcentual"
  | "emite_factura";
type SellerSortState = { sortBy?: SellerSortBy; order?: "ascend" | "descend" };

const parseSellerDate = (value: unknown) => {
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return dayjs(new Date(year, month - 1, day));
  }
  return dayjs(value as any);
};

const parsePaymentDate = (value: unknown) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return dayjs(value.slice(0, 10));
  }
  return parseSellerDate(value);
};

const formatPaymentDate = (value: unknown) =>
  value ? parsePaymentDate(value).format("DD/MM/YYYY") : "";

export default function SellerTable({
  refreshKey,
  setRefreshKey,
  isFactura,
}: {
  refreshKey: number;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  isFactura: boolean;
}) {
  const [selected, setSelected] = useState<SellerRow | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [pagoFilter, setPagoFilter] = useState("todos");
  const [fechaPagoFilter, setFechaPagoFilter] = useState<"todos" | "sin_solicitud" | "8" | "18" | "28">("todos");
  const [tableSort, setTableSort] = useState<SellerSortState>({});
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPendingPayment, setTotalPendingPayment] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debtModal, setDebtModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [declineReasonOpen, setDeclineReasonOpen] = useState(false);
  const [declineReasonTarget, setDeclineReasonTarget] = useState<SellerRow | null>(null);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const sellersRequestSeq = useRef(0);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const refresh = () => setRefreshKey((key) => key + 1);

  const getEstadoVendedor = (
    row: Pick<ISeller, "fecha_vigencia" | "declinacion_servicio_fecha">
  ) => {
    const hoy = dayjs();
    const vigencia = parseSellerDate(row.fecha_vigencia);
    if (row.declinacion_servicio_fecha) {
      const retiroHasta = vigencia.add(5, "day").endOf("day");
      if (!hoy.isAfter(retiroHasta)) return "Declinando el servicio";
      return "Ya no es cliente";
    }
    const diasVencido = hoy.diff(vigencia, "day");

    if (diasVencido <= 0) return "Activo";
    if (diasVencido <= 20) return "Debe renovar";
    return "Ya no es cliente";
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "Activo":
        return {
          color: "#52c41a",
          backgroundColor: "#f6ffed",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      case "Debe renovar":
        return {
          color: "#fa8c16",
          backgroundColor: "#fff7e6",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      case "Declinando el servicio":
        return {
          color: "#0958d9",
          backgroundColor: "#e6f4ff",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      case "Ya no es cliente":
        return {
          color: "#ff4d4f",
          backgroundColor: "#fff2f0",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      default:
        return {};
    }
  };

  const canDeclineSeller = (row: SellerRow) => {
    if (row.declinacion_servicio_fecha) return false;
    return true;
  };

  const canRenewSeller = (row: SellerRow) =>
    getEstadoVendedor(row) !== "Ya no es cliente";

  const handleAdminDecline = (row: SellerRow) => {
    setDeclineReasonTarget(row);
    setDeclineReasonOpen(true);
  };

  const handleCancelDecline = (row: SellerRow) => {
    Modal.confirm({
      title: "Anular declinacion",
      content: `Se anulara la declinacion de ${row.nombre}.`,
      okText: "Anular",
      cancelText: "Cancelar",
      onOk: async () => {
        const res = await cancelSellerServiceDeclineAPI(row.key);
        if (!res?.success) throw new Error("No se pudo anular");
        message.success("Declinacion anulada");
        refresh();
      },
    });
  };

  const openDrawer = (row: SellerRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const closeAll = () => {
    setDebtModal(false);
    setInfoModal(false);
    setDrawerOpen(false);
    setSelected(null);
  };

  const renderSellerActions = (row: SellerRow) => (
    <div className="seller-actions">
      <PayDebtButton seller={row} onSuccess={refresh} />
      {row.declinacion_servicio_fecha ? (
        <Tooltip title="Anular declinacion">
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              handleCancelDecline(row);
            }}
          >
            Anular
          </Button>
        </Tooltip>
      ) : (
        <Tooltip
          title={
            canDeclineSeller(row)
              ? "Declinar servicio"
              : "Ya existe una declinacion registrada"
          }
        >
          <Button
            danger
            size="small"
            disabled={!canDeclineSeller(row)}
            onClick={(event) => {
              event.stopPropagation();
              handleAdminDecline(row);
            }}
          >
            Declinar
          </Button>
        </Tooltip>
      )}
      <Tooltip
        title={
          canRenewSeller(row)
            ? "Renovar vendedor"
            : "No se puede renovar un vendedor que ya no es cliente"
        }
      >
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          disabled={!canRenewSeller(row)}
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
            setDebtModal(true);
          }}
        />
      </Tooltip>
    </div>
  );

  const handleSubmitDeclineReason = async (reason: string) => {
    if (!declineReasonTarget) return;
    setDeclineLoading(true);
    try {
      const res = await adminDeclineSellerServiceAPI(declineReasonTarget.key, { reason });
      if (!res?.success) throw new Error("No se pudo declinar");
      message.success("Declinacion registrada");
      setDeclineReasonOpen(false);
      setDeclineReasonTarget(null);
      refresh();
    } catch (error) {
      console.error(error);
      message.error("No se pudo declinar");
    } finally {
      setDeclineLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "nombre",
        key: "nombre",
        fixed: "left" as const,
        sorter: true,
        sortOrder: tableSort.sortBy === "nombre" ? tableSort.order : null,
      },
      {
        title: "Estado",
        key: "estado",
        render: (_: unknown, row: SellerRow) => {
          const estado = getEstadoVendedor(row);
          return <span style={getEstadoColor(estado)}>{estado}</span>;
        },
        sorter: true,
        sortOrder: tableSort.sortBy === "estado" ? tableSort.order : null,
      },
      {
        title: "Pago pendiente",
        dataIndex: "pagoTotal",
        key: "pago_pendiente",
        sorter: true,
        sortOrder: tableSort.sortBy === "pago_pendiente" ? tableSort.order : null,
      },
      {
        title: "Fecha Vigencia",
        dataIndex: "fecha_vigencia",
        key: "fecha_vigencia",
        sorter: true,
        sortOrder: tableSort.sortBy === "fecha_vigencia" ? tableSort.order : null,
      },
      {
        title: "Fecha pago asignada",
        dataIndex: "fecha_pago_asignada_label",
        key: "fecha_pago_asignada",
        render: (value: string) => value || "-",
        sorter: true,
        sortOrder: tableSort.sortBy === "fecha_pago_asignada" ? tableSort.order : null,
      },
      {
        title: "Pago Mensual",
        dataIndex: "pago_mensual",
        key: "pago_mensual",
        render: (_: unknown, row: SellerRow) => (
          <Button
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              openDrawer(row);
            }}
          >
            {row.pago_mensual}
          </Button>
        ),
        sorter: true,
        sortOrder: tableSort.sortBy === "pago_mensual" ? tableSort.order : null,
      },
      {
        title: "Comision %",
        dataIndex: "comision_porcentual",
        key: "comision_porcentual",
        sorter: true,
        sortOrder: tableSort.sortBy === "comision_porcentual" ? tableSort.order : null,
      },
      {
        title: "Emite factura?",
        dataIndex: "emite_factura",
        key: "emite_factura",
        render: (tieneFactura: boolean) => (tieneFactura ? "Si" : "No"),
        sorter: true,
        sortOrder: tableSort.sortBy === "emite_factura" ? tableSort.order : null,
      },
      {
        title: "Acciones",
        key: "acciones",
        render: (_: unknown, row: SellerRow) => renderSellerActions(row),
        width: 150,
        fixed: "right" as const,
      },
    ],
    [tableSort]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, estadoFilter, pagoFilter, fechaPagoFilter, tableSort, isFactura]);

  useEffect(() => {
    const requestSeq = sellersRequestSeq.current + 1;
    sellersRequestSeq.current = requestSeq;

    (async () => {
      setLoading(true);
      try {
        const statusParam =
          estadoFilter === "Activo"
            ? "activo"
            : estadoFilter === "Debe renovar"
            ? "debe_renovar"
            : estadoFilter === "Ya no es cliente"
            ? "ya_no_es_cliente"
            : estadoFilter === "Declinando el servicio"
            ? "declinando_servicio"
            : undefined;
        const pendingPaymentParam =
          pagoFilter === "con deuda"
            ? "con_deuda"
            : pagoFilter === "sin deuda"
            ? "sin_deuda"
            : undefined;
        const res = await getSellersAPI({
          q: debouncedSearch || undefined,
          status: statusParam,
          pendingPayment: pendingPaymentParam,
          assignedPaymentDay: fechaPagoFilter === "todos" ? undefined : fechaPagoFilter,
          sortBy: tableSort.sortBy,
          sortOrder: tableSort.order === "descend" ? "desc" : "asc",
          page,
          pageSize,
        });
        const response = res as SellerListResponse | ISeller[] | undefined;
        if (requestSeq !== sellersRequestSeq.current) return;
        const rawSellers = Array.isArray(response) ? response : response?.data || [];

        const rows: SellerRow[] = rawSellers.map((seller) => {
          const mensual = (seller.pago_sucursales || [])
            .filter((p) => p.activo !== false)
            .reduce(
              (totalMensual: number, p: ISucursalPago) =>
                totalMensual +
                Number(p.alquiler || 0) +
                Number(p.exhibicion || 0) +
                Number(p.delivery || 0) +
                Number(p.entrega_simple || 0),
              0
            );

          const saldoPendiente = Number((seller as any).saldo_pendiente ?? 0);
          const deuda = Number((seller as any).deuda ?? 0);
          const pagoPendienteFromApi = Number((seller as any).pago_pendiente);
          const pagoPendiente = Number.isFinite(pagoPendienteFromApi)
            ? pagoPendienteFromApi
            : saldoPendiente - deuda;

          return {
            ...seller,
            key: seller._id,
            nombre: `${seller.nombre} ${seller.apellido || ""}`.trim(),
            fecha_vigencia: dayjs(seller.fecha_vigencia).format("DD/MM/YYYY"),
            fecha: dayjs(seller.fecha).format("DD/MM/YYYY"),
            fecha_pago_asignada_label: formatPaymentDate(seller.fecha_pago_asignada),
            deuda,
            pagoTotal: `Bs. ${Number.isFinite(pagoPendiente) ? pagoPendiente.toFixed(2) : "0.00"}`,
            pagoTotalInt: Number.isFinite(pagoPendiente) ? pagoPendiente : 0,
            pago_mensual: `Bs. ${mensual.toFixed(2)}`,
            saldo_pendiente: saldoPendiente,
          };
        });

        setSellers(rows);
        setTotal(Array.isArray(response) ? rows.length : Number(response?.total || 0));
        setTotalPendingPayment(
          Array.isArray(response)
            ? rows.reduce((sum, row) => sum + row.pagoTotalInt, 0)
            : Number(response?.totalPendingPayment || 0)
        );
      } catch {
        if (requestSeq === sellersRequestSeq.current) {
          message.error("Error al cargar vendedores");
        }
      } finally {
        if (requestSeq === sellersRequestSeq.current) {
          setLoading(false);
        }
      }
    })();
  }, [refreshKey, debouncedSearch, estadoFilter, pagoFilter, fechaPagoFilter, tableSort, isFactura, page, pageSize]);

  return (
    <>
      <Space direction="horizontal" size="middle" className="seller-filters mb-4">
        <Input
          placeholder="Buscar vendedor..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          allowClear
        />

        <Select
          value={estadoFilter}
          onChange={setEstadoFilter}
          options={[
            { value: "todos", label: "Todos" },
            { value: "Activo", label: "Activos" },
            { value: "Declinando el servicio", label: "Declinando el servicio" },
            { value: "Debe renovar", label: "Debe renovar" },
            { value: "Ya no es cliente", label: "Ya no es cliente" },
          ]}
        />
        <Select
          value={pagoFilter}
          onChange={setPagoFilter}
          options={[
            { value: "todos", label: "Todos" },
            { value: "con deuda", label: "Pago Pendiente" },
            { value: "sin deuda", label: "Sin Pago Pendiente" },
          ]}
        />
        <Select
          value={fechaPagoFilter}
          onChange={setFechaPagoFilter}
          style={{ minWidth: 190 }}
          options={[
            { value: "todos", label: "Fecha pago: todos" },
            { value: "sin_solicitud", label: "Sin solicitud" },
            { value: "8", label: "Dia 8" },
            { value: "18", label: "Dia 18" },
            { value: "28", label: "Dia 28" },
          ]}
        />
      </Space>

      <div className="seller-total-title">
        Pago pendiente{" "}
        {loading ? <Spin size="small" /> : `Bs. ${totalPendingPayment.toFixed(2)}`}
      </div>

      {isMobile ? (
        <div className="seller-mobile-list">
          {sellers.length === 0 && !loading ? <Empty description="Sin vendedores" /> : null}
          {sellers.map((row) => {
            const estado = getEstadoVendedor(row);
            return (
              <button
                type="button"
                className="seller-mobile-card"
                key={row.key}
                onClick={() => {
                  setSelected(row);
                  setInfoModal(true);
                }}
              >
                <div className="seller-mobile-card-header">
                  <strong>{row.nombre}</strong>
                  <span style={getEstadoColor(estado)}>{estado}</span>
                </div>
                <div className="seller-mobile-grid">
                  <span>Pago pendiente</span>
                  <strong>{row.pagoTotal}</strong>
                  <span>Vigencia</span>
                  <strong>{String(row.fecha_vigencia)}</strong>
                  <span>Pago asignado</span>
                  <strong>{row.fecha_pago_asignada_label || "-"}</strong>
                  <span>Pago mensual</span>
                  <Button
                    type="link"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDrawer(row);
                    }}
                  >
                    {row.pago_mensual}
                  </Button>
                </div>
                <div onClick={(event) => event.stopPropagation()}>
                  {renderSellerActions(row)}
                </div>
              </button>
            );
          })}
          <Pagination
            className="seller-mobile-pagination"
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            pageSizeOptions={["5", "10", "20", "50"]}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
            showTotal={(totalRows, range) => `${range[0]}-${range[1]} de ${totalRows}`}
          />
        </div>
      ) : (
        <Table
          loading={loading}
          columns={columns}
          dataSource={sellers}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["5", "10", "20", "50"],
            showTotal: (totalRows, range) =>
              `${range[0]}-${range[1]} de ${totalRows} registros`,
          }}
          onChange={(pagination, _filters, sorter) => {
            const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
            const nextOrder =
              activeSorter?.order === "ascend" || activeSorter?.order === "descend"
                ? activeSorter.order
                : undefined;
            const nextSortBy = String(activeSorter?.columnKey || "") as SellerSortBy;
            setTableSort(nextOrder ? { sortBy: nextSortBy, order: nextOrder } : {});
            setPage(pagination.current || 1);
            setPageSize(pagination.pageSize || 10);
          }}
          scroll={{ x: "max-content" }}
          onRow={(row) => ({
            onClick: () => {
              setSelected(row);
              setInfoModal(true);
            },
          })}
        />
      )}

      {selected && (
        <>
          <DebtModal
            visible={debtModal}
            seller={selected}
            onCancel={closeAll}
            onSuccess={() => {
              closeAll();
              refresh();
            }}
          />
          <SellerInfoModalTry
            visible={infoModal && !debtModal}
            seller={selected}
            onCancel={closeAll}
            onRefresh={refresh}
            onSuccess={() => {
              closeAll();
              refresh();
            }}
          />
          <SucursalDrawer
            open={drawerOpen}
            onClose={closeAll}
            sellerName={selected.nombre}
            sucursales={selected.pago_sucursales}
          />
        </>
      )}

      <DeclineServiceReasonModal
        open={declineReasonOpen}
        loading={declineLoading}
        title="Declinar servicio"
        description={declineReasonTarget ? `Se registrará la baja de ${declineReasonTarget.nombre}.` : undefined}
        okText="Declinar"
        onCancel={() => {
          setDeclineReasonOpen(false);
          setDeclineReasonTarget(null);
        }}
        onConfirm={handleSubmitDeclineReason}
      />
    </>
  );
}
