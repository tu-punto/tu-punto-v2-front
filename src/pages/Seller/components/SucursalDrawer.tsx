import { Drawer, Table } from "antd";
import { ISucursalPago } from "../../../models/sellerModels";

interface Props {
  open: boolean;
  onClose: () => void;
  sellerName?: string;
  sucursales: ISucursalPago[];
}

export default function SucursalDrawer({
  open,
  onClose,
  sellerName,
  sucursales,
}: Props) {
  const showDelivery = sucursales.some(
    (sucursal) => Number(sucursal?.delivery || 0) > 0
  );

  const columns = [
    { title: "Sucursal", dataIndex: "sucursalName", key: "sucursal" },
    {
      title: "Almacenamiento",
      dataIndex: "alquiler",
      key: "alquiler",
      render: (value: number) => `Bs. ${value}`,
    },
    {
      title: "Exhibicion",
      dataIndex: "exhibicion",
      key: "exhibicion",
      render: (value: number) => `Bs. ${value}`,
    },
    {
      title: "Entrega Simple",
      dataIndex: "entrega_simple",
      key: "entrega",
      render: (value: number) => `Bs. ${value}`,
    },
    ...(showDelivery
      ? [
          {
            title: "Delivery",
            dataIndex: "delivery",
            key: "delivery",
            render: (value: number) => `Bs. ${value}`,
          },
        ]
      : []),
  ];

  return (
    <Drawer
      title={`Detalle por sucursal - ${sellerName ?? ""}`}
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Table
        dataSource={sucursales.map((sucursal, index) => ({
          ...sucursal,
          key: index,
        }))}
        columns={columns}
        pagination={false}
      />
    </Drawer>
  );
}
