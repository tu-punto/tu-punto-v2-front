import { Button, Table, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { EditOutlined } from "@ant-design/icons";

import PayDebtButton from "./components/PayDebtButton";
import DebtModal from "./DebtModal";
import SellerInfoModalTry from "./SellerInfoModal";
import SucursalDrawer from "./components/SucursalDrawer";

import { getSellersAPI } from "../../api/seller";
import { getSellerAdvancesById } from "../../helpers/sellerHelpers";

import { ISeller, ISucursalPago } from "../../models/sellerModels";
import { getSalesBySellerIdAPI } from "../../api/sales";

/* ---------- tipos de fila ---------- */
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
  const [pending, setPending] = useState<SellerRow[]>([]);
  const [onTime, setOnTime] = useState<SellerRow[]>([]);
  const [selected, setSelected] = useState<SellerRow | null>(null);

  const [debtModal, setDebtModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = () => setRefreshKey((k: any) => k + 1);

  /* ---- columnas ---- */
  const columns = [
    { title: "Nombre", dataIndex: "nombre", key: "nombre", fixed: "left" as const },
    { title: "Pago total", dataIndex: "pagoTotal", key: "pagoTotal" },
    { title: "Fecha Vigencia", dataIndex: "fecha_vigencia", key: "fecha_vigencia" },
    {
      title: "Pago Mensual",
      dataIndex: "pago_mensual",
      key: "pago_mensual",
      render: (_: any, row: SellerRow) => (
        <Button type="link" onClick={(e) => { e.stopPropagation(); openDrawer(row); }}>
          {row.pago_mensual}
        </Button>
      ),
    },
    { title: "Comisión %", dataIndex: "comision_porcentual", key: "comision_porcentual" },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, row: SellerRow) => (
        <div className="flex gap-2 justify-end">
          <PayDebtButton seller={row} onSuccess={refresh} />
          <Tooltip title="Renovar vendedor">
            <Button icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setSelected(row); setDebtModal(true); }} />
          </Tooltip>
        </div>
      ),
    },
  ];

  const fetchSaldoPendiente = async (sellerId: string) => {
    let saldoPendiente = 0;
    const sales = await getSalesBySellerIdAPI(sellerId);
    if (!sales.length) {
      console.error("Error fetching sales for seller:", sellerId);
      return saldoPendiente;
    }

    saldoPendiente = sales && sales.reduce((acc: number, sale: any) => {
      if (sale.deposito_realizado) return acc;
      let subtotalDeuda = 0
      if (sale.id_pedido.pagado_al_vendedor) {
        subtotalDeuda = -sale.utilidad
      } else {
        subtotalDeuda = (sale.cantidad * sale.precio_unitario) - sale.utilidad;
      }

      return acc + subtotalDeuda - sale.id_pedido.adelanto_cliente - sale.id_pedido.cargo_delivery;
    }, 0)
    return saldoPendiente;
  }

  /* ---- carga ---- */
  useEffect(() => {
    (async () => {
      const res = await getSellersAPI();
      const sellers: ISeller[] = res.data || res;

      const rows: SellerRow[] = await Promise.all(
        sellers.map(async (seller) => {

          const saldoPendiente = await fetchSaldoPendiente(seller._id);
          const date = new Date(seller.fecha);
          const finish_date = new Date(seller.fecha_vigencia);
          const mensual = seller.pago_sucursales.reduce(
            (t: number, p: ISucursalPago) =>
              t +
              Number(p.alquiler) +
              Number(p.exhibicion) +
              Number(p.delivery) +
              Number(p.entrega_simple),
            0
          );

          return {
            ...seller,
            key: seller._id,
            fecha_vigencia: finish_date.toLocaleDateString("es-ES"),
            fecha: date.toLocaleDateString("es-ES"),
            deuda: seller.deuda,
            pagoTotal: `Bs. ${saldoPendiente - seller.deuda}`,
            pagoTotalInt: saldoPendiente - seller.deuda,
            pago_mensual: `Bs. ${mensual}`,
          };
        })
      );

      setPending(rows.filter((r) => r.pagoTotalInt !== 0));
      setOnTime(rows.filter((r) => r.pagoTotalInt === 0));
    })();
  }, [refreshKey]);

  /* ---- helpers ---- */
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

  const filterFactura = (arr: SellerRow[]) =>
    isFactura ? arr.filter((s) => s.emite_factura) : arr.filter((s) => !s.emite_factura);

  /* ---- render ---- */
  return (
    <>
      <Table
        columns={columns}
        dataSource={filterFactura(pending)}
        pagination={{ pageSize: 5 }}
        scroll={{ x: "max-content" }}
        title={() => (
          <h2 className="text-2xl font-bold">
            Pago pendiente Bs.&nbsp;
            {filterFactura(pending).reduce((t, s) => t + s.pagoTotalInt, 0)}
          </h2>
        )}
        onRow={(r) => ({ onClick: () => { setSelected(r); setInfoModal(true); } })}
      />

      <Table
        columns={columns}
        dataSource={filterFactura(onTime)}
        pagination={{ pageSize: 5 }}
        scroll={{ x: "max-content" }}
        title={() => <h2 className="text-2xl font-bold">Pago al día</h2>}
        onRow={(r) => ({ onClick: () => { setSelected(r); setInfoModal(true); } })}
      />

      {selected && (
        <>
          <DebtModal
            visible={debtModal}
            seller={selected}
            onCancel={closeAll}
            onSuccess={() => { closeAll(); refresh(); }}
          />
          <SellerInfoModalTry
            visible={infoModal && !debtModal}
            seller={selected}
            onCancel={closeAll}
            onSuccess={() => { closeAll(); refresh(); }}
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
