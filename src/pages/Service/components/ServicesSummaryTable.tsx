
import { Table } from "antd";
import { ISucursalPago } from "../../Seller/SellerFormModal";

const SERVICIOS_LABELS: Record<Servicio, string> = {
  alquiler: "Almacenamiento",
  exhibicion: "Exhibición",
  entrega_simple: "Entregas Simples",
  delivery: "Delivery",
};

type Props = {
  sellers: {
    pago_sucursales: ISucursalPago[];
  }[];
};

export default function ServicesSummaryTable({ sellers }: Props) {
  const dataMatrix: Record<string, Record<Servicio, number>> = {};
  const totalBySucursal: Record<string, number> = {};
  const totalByServicio: Record<Servicio, number> = {
    alquiler: 0,
    exhibicion: 0,
    entrega_simple: 0,
    delivery: 0,
  };

  let totalGeneral = 0;

  // Recorremos todos los vendedores
  sellers.forEach((seller) => {
    seller.pago_sucursales.forEach((pago) => {
      const sucursal = pago.nombre_sucursal;

      if (!dataMatrix[sucursal]) {
        dataMatrix[sucursal] = {
          alquiler: 0,
          exhibicion: 0,
          entrega_simple: 0,
          delivery: 0,
        };
      }

      (["alquiler", "exhibicion", "entrega_simple", "delivery"] as Servicio[]).forEach((serv) => {
        const monto = Number(pago[serv]) || 0;
        dataMatrix[sucursal][serv] += monto;
        totalByServicio[serv] += monto;
        totalBySucursal[sucursal] = (totalBySucursal[sucursal] || 0) + monto;
        totalGeneral += monto;
      });
    });
  });

  const sucursales = Object.keys(dataMatrix);
  const servicios = Object.keys(SERVICIOS_LABELS) as Servicio[];

  const rows = servicios.map((serv) => {
    const row: Record<string, any> = {
      key: serv,
      servicio: SERVICIOS_LABELS[serv],
    };

    sucursales.forEach((sucursal) => {
      row[sucursal] = dataMatrix[sucursal]?.[serv] || 0;
    });

    row.total = totalByServicio[serv];
    return row;
  });

  const totalRow: Record<string, any> = {
    key: "total",
    servicio: "TOTAL",
  };

  sucursales.forEach((sucursal) => {
    totalRow[sucursal] = totalBySucursal[sucursal] || 0;
  });

  totalRow.total = totalGeneral;
  rows.push(totalRow);

  const columns = [
    {
      title: "Servicio \\ Sucursal",
      dataIndex: "servicio",
      key: "servicio",
      fixed: "left" as const,
    },
    ...sucursales.map((sucursal) => ({
      title: sucursal,
      dataIndex: sucursal,
      key: sucursal,
      render: (val: number) =>
        val ? <span>{val.toFixed(2)}</span> : <span>-</span>,
    })),
    {
      title: "TOTAL",
      dataIndex: "total",
      key: "total",
      render: (val: number) => <strong>{val.toFixed(2)}</strong>,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={rows}
      pagination={{
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          defaultPageSize: 10,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
        }}
      summary={() => null}
    />
  );
}
