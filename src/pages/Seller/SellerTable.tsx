import { Button, Table, Tooltip, Select, Space, Input } from "antd";
import { useEffect, useState } from "react";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PayDebtButton from "./components/PayDebtButton";
import DebtModal from "./DebtModal";
import SellerInfoModalTry from "./SellerInfoModal";
import SucursalDrawer from "./components/SucursalDrawer";

import { getSellersAPI } from "../../api/seller";
import { getSalesBySellerIdAPI } from "../../api/sales";

import { ISeller, ISucursalPago } from "../../models/sellerModels";

type SellerRow = ISeller & {
  key: string;
  deudaInt: number;
  pagoTotalInt: number;
  pago_mensual: string;
};

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
  const [debtModal, setDebtModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = () => setRefreshKey((k: any) => k + 1);

  const getEstadoVendedor = (fechaVigencia: string) => {
    const hoy = dayjs();
    const vigencia = dayjs(fechaVigencia, "DD/MM/YYYY");
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
        const estado = getEstadoVendedor(row.fecha_vigencia);
        return <span style={getEstadoColor(estado)}>{estado}</span>;
      },
      sorter: (a: any, b: any) => {
        const estadoA = getEstadoVendedor(a.fecha_vigencia);
        const estadoB = getEstadoVendedor(b.fecha_vigencia);
        return estadoA.localeCompare(estadoB);
      },
    },
    {
      title: "Pago total",
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
        const getNumericValue = (str: string) => parseFloat(str.replace(/[Bs.\s]/g, '')) || 0;
        return getNumericValue(a.pago_mensual) - getNumericValue(b.pago_mensual);
      },
    },
    {
      title: "Comisión %",
      dataIndex: "comision_porcentual",
      key: "comision_porcentual",
      sorter: (a: any, b: any) => (a.comision_porcentual || 0) - (b.comision_porcentual || 0),
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
      fixed: 'right' as const,
    },
  ];

  const fetchSaldoPendiente = async (sellerId: string) => {
    const sales = await getSalesBySellerIdAPI(sellerId);
    if (!sales.length) {
      return 0;
    }

    const pedidosProcesados = new Set();

    const saldoPendiente = sales.reduce((acc: number, sale: any) => {
      if (
        sale.deposito_realizado ||
        sale.id_pedido.estado_pedido === "En Espera"
      ) {
        return acc;
      }

      let subtotalDeuda = 0;

      if (sale.id_pedido.pagado_al_vendedor) {
        subtotalDeuda = -sale.utilidad;
      } else {
        subtotalDeuda = sale.cantidad * sale.precio_unitario - sale.utilidad;
      }

      if (!pedidosProcesados.has(sale.id_pedido._id)) {
        const adelanto = sale.id_pedido.adelanto_cliente || 0;
        const delivery = sale.id_pedido.cargo_delivery || 0;

        subtotalDeuda -= adelanto + delivery;
        pedidosProcesados.add(sale.id_pedido._id);
      }

      return acc + subtotalDeuda;
    }, 0);

    return saldoPendiente;
  };

  useEffect(() => {
    (async () => {
      const res = await getSellersAPI();
      const sellers: ISeller[] = res.data || res;

      const rows: SellerRow[] = await Promise.all(
        sellers.map(async (seller) => {
          const mensual = seller.pago_sucursales.reduce(
            (t: number, p: ISucursalPago) =>
              t +
              Number(p.alquiler) +
              Number(p.exhibicion) +
              Number(p.delivery) +
              Number(p.entrega_simple),
            0
          );

          const saldoPendiente = await fetchSaldoPendiente(seller._id);
          const deuda = Number(seller.deuda) || 0;
          const pagoPendiente = saldoPendiente - deuda;

          return {
            ...seller,
            key: seller._id,
            nombre: `${seller.nombre} ${seller.apellido || ""}`.trim(),
            fecha_vigencia: dayjs(seller.fecha_vigencia).format("DD/MM/YYYY"),
            fecha: dayjs(seller.fecha).format("DD/MM/YYYY"),
            deuda: deuda,
            pagoTotal: `Bs. ${pagoPendiente.toFixed(2)}`,
            pagoTotalInt: pagoPendiente,
            pago_mensual: `Bs. ${mensual}`,
            saldo_pendiente: saldoPendiente,
          };
        })
      );

      setSellers(rows);
    })();
  }, [refreshKey]);

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

  const filterSellers = (arr: SellerRow[]) => {
    let filtered = arr;

    if (searchText) {
      filtered = filtered.filter((s) =>
        s.nombre.toLowerCase().includes(searchText.toLowerCase()) 
      );
    }

    // Filtro por estado
    if (estadoFilter !== "todos") {
      filtered = filtered.filter(
        (s) => getEstadoVendedor(s.fecha_vigencia) === estadoFilter
      );
    }

    // Filtro por pago
    if (pagoFilter !== "todos") {
      filtered = filtered.filter((s) => {
        if (pagoFilter === "con deuda") {
          return s.pagoTotalInt !== 0;
        } else if (pagoFilter === "sin deuda") {
          return s.pagoTotalInt === 0;
        }
        return true;
      });
    }

    // Filtrar por factura
    return isFactura
      ? filtered.filter((s) => s.emite_factura)
      : filtered.filter((s) => !s.emite_factura);
  };

  const filteredSellers = filterSellers(sellers);

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
        columns={columns}
        dataSource={filteredSellers}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          defaultPageSize: 10,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
        }}
        scroll={{ x: "max-content" }}
        title={() => (
          <h2 className="text-2xl font-bold">
            Pago pendiente Bs.&nbsp;
            {filteredSellers
              .reduce((t, s) => t + s.pagoTotalInt, 0)
              .toFixed(2)}
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
