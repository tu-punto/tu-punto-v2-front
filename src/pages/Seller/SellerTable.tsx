import { Button, Table, Tooltip, Select, Space, Input, message } from "antd";
import { useEffect, useState } from "react";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PayDebtButton from "./components/PayDebtButton";
import DebtModal from "./DebtModal";
import SellerInfoModalTry from "./SellerInfoModal";
import SucursalDrawer from "./components/SucursalDrawer";

import { getSellersAPI } from "../../api/seller";

import { ISeller, ISucursalPago } from "../../models/sellerModels";

type SellerRow = ISeller & {
  key: string;
  deudaInt: number;
  pagoTotalInt: number;
  pago_mensual: string;
  fecha_pago_asignada_label: string;
};

const parseSellerDate = (value: any) => {
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return dayjs(new Date(year, month - 1, day));
  }
  return dayjs(value);
};

const parsePaymentDate = (value: any) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return dayjs(value.slice(0, 10));
  }
  return parseSellerDate(value);
};

const formatPaymentDate = (value: any) =>
  value ? parsePaymentDate(value).format("DD/MM/YYYY") : "";

export default function SellerTable({
  refreshKey,
  setRefreshKey,
  isFactura,
}: any) {
  const [selected, setSelected] = useState<SellerRow | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [pagoFilter, setPagoFilter] = useState("todos");
  const [sellers, setSellers] = useState<SellerRow[]>([]);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debtModal, setDebtModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = () => setRefreshKey((k: any) => k + 1);

  const getEstadoVendedor = (row: Pick<ISeller, "fecha_vigencia" | "declinacion_servicio_fecha">) => {
    const hoy = dayjs();
    const vigencia = parseSellerDate(row.fecha_vigencia);
    if (row.declinacion_servicio_fecha && hoy.isBefore(vigencia.add(6, "day"), "day")) {
      return "Declinando el servicio";
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

  // ✅ Columnas con sorters
  const columns = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      fixed: "left" as const,
      sorter: (a: any, b: any) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: "Estado",
      key: "estado",
      render: (_: any, row: SellerRow) => {
        const estado = getEstadoVendedor(row);
        return <span style={getEstadoColor(estado)}>{estado}</span>;
      },
      sorter: (a: any, b: any) => {
        const estadoA = getEstadoVendedor(a);
        const estadoB = getEstadoVendedor(b);
        return estadoA.localeCompare(estadoB);
      },
    },
    {
      title: "Pago pendiente",
      dataIndex: "pagoTotal",
      key: "pagoTotal",
      sorter: (a: any, b: any) => a.pagoTotalInt - b.pagoTotalInt,
    },
    {
      title: "Fecha Vigencia",
      dataIndex: "fecha_vigencia",
      key: "fecha_vigencia",
      sorter: (a: any, b: any) =>
        dayjs(a.fecha_vigencia, "DD/MM/YYYY").unix() -
        dayjs(b.fecha_vigencia, "DD/MM/YYYY").unix(),
    },
    {
      title: "Fecha pago asignada",
      dataIndex: "fecha_pago_asignada_label",
      key: "fecha_pago_asignada",
      render: (value: string) => value || "-",
      filters: [
        { text: "Sin solicitud", value: "sin_solicitud" },
        { text: "Dia 8", value: "8" },
        { text: "Dia 18", value: "18" },
        { text: "Dia 28", value: "28" },
      ],
      onFilter: (value: any, row: SellerRow) => {
        if (value === "sin_solicitud") return !row.fecha_pago_asignada;
        const date = parsePaymentDate(row.fecha_pago_asignada);
        return date.isValid() && String(date.date()) === String(value);
      },
      sorter: (a: any, b: any) => {
        const dateA = a.fecha_pago_asignada ? parsePaymentDate(a.fecha_pago_asignada).unix() : 0;
        const dateB = b.fecha_pago_asignada ? parsePaymentDate(b.fecha_pago_asignada).unix() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Pago Mensual",
      dataIndex: "pago_mensual",
      key: "pago_mensual",
      render: (_: any, row: SellerRow) => (
        <Button
          type="link"
          onClick={(e) => {
            e.stopPropagation();
            openDrawer(row);
          }}
        >
          {row.pago_mensual}
        </Button>
      ),
      sorter: (a: any, b: any) => {
        const getNumericValue = (str: string) =>
          parseFloat(str.replace(/[Bs.\s]/g, "")) || 0;
        return (
          getNumericValue(a.pago_mensual) - getNumericValue(b.pago_mensual)
        );
      },
    },
    {
      title: "Comisión %",
      dataIndex: "comision_porcentual",
      key: "comision_porcentual",
      sorter: (a: any, b: any) =>
        (a.comision_porcentual || 0) - (b.comision_porcentual || 0),
    },
    {
      title: "Emite factura?",
      dataIndex: "emite_factura",
      key: "emite_factura",
      render: (tieneFactura: boolean) => (tieneFactura ? "Sí" : "No"),
      sorter: (a: any, b: any) => {
        const valorA = a.emite_factura ? 1 : 0;
        const valorB = b.emite_factura ? 1 : 0;
        return valorA - valorB;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, row: SellerRow) => (
        <div className="flex gap-2 justify-end">
          <PayDebtButton seller={row} onSuccess={refresh} />
          <Tooltip title="Renovar vendedor">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(row);
                setDebtModal(true);
              }}
            />
          </Tooltip>
        </div>
      ),
      width: 150,
      fixed: "right" as const,
    },
  ];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
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
        });
        const sellers: ISeller[] = (Array.isArray(res) ? res : []) as ISeller[];

        const rows: SellerRow[] = await Promise.all(
          sellers.map(async (seller) => {
            const mensual = seller.pago_sucursales
              .filter((p) => p.activo)
              .reduce(
                (t: number, p: ISucursalPago) =>
                  t +
                  Number(p.alquiler) +
                  Number(p.exhibicion) +
                  Number(p.delivery) +
                  Number(p.entrega_simple),
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
              deuda: deuda,
              pagoTotal: `Bs. ${Number.isFinite(pagoPendiente) ? pagoPendiente.toFixed(2) : "0.00"}`,
              pagoTotalInt: Number.isFinite(pagoPendiente) ? pagoPendiente : 0,
              pago_mensual: `Bs. ${mensual}`,
              saldo_pendiente: saldoPendiente,
            };
          })
        );

        setSellers(rows);
      } catch (error) {
        message.error("Error al cargar vendedores");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey, debouncedSearch, estadoFilter, pagoFilter, isFactura]);

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

  const filteredSellers = sellers;

  return (
    <>
      <Space direction="horizontal" size="middle" className="mb-4">
        <Input
          placeholder="Buscar vendedor..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />

        <Select
          value={estadoFilter}
          onChange={setEstadoFilter}
          style={{ width: 200 }}
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
          style={{ width: 200 }}
          options={[
            { value: "todos", label: "Todos" },
            { value: "con deuda", label: "Pago Pendiente" },
            { value: "sin deuda", label: "Sin Pago Pendiente" },
          ]}
        />
      </Space>

      <Table
        loading={loading}
        columns={columns}
        dataSource={filteredSellers}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          defaultPageSize: 10,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} de ${total} registros`,
        }}
        scroll={{ x: "max-content" }}
        title={() => (
          <h2 className="text-2xl font-bold">
            Pago pendiente Bs.&nbsp;
            {filteredSellers.reduce((t, s) => t + s.pagoTotalInt, 0).toFixed(2)}
          </h2>
        )}
        onRow={(r) => ({
          onClick: () => {
            setSelected(r);
            setInfoModal(true);
          },
        })}
      />

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
    </>
  );
}
