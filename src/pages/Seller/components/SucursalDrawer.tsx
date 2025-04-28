import { Drawer, Table } from "antd";
import { ISucursalPago } from "../../../models/sellerModels";

interface Props {
  open: boolean;
  onClose: () => void;
  sellerName?: string;
  sucursales: ISucursalPago[];
}

const columns = [
  { title: "Sucursal", dataIndex: "sucursalName", key: "sucursal" },
  { title: "Alquiler", dataIndex: "alquiler", key: "alquiler", render: (v: number) => `Bs. ${v}` },
  { title: "Exhibición", dataIndex: "exhibicion", key: "exhibicion", render: (v: number) => `Bs. ${v}` },
  { title: "Entrega Simple", dataIndex: "entrega_simple", key: "entrega", render: (v: number) => `Bs. ${v}` },
  { title: "Delivery", dataIndex: "delivery", key: "delivery", render: (v: number) => `Bs. ${v}` },
];

export default function SucursalDrawer({
  open,
  onClose,
  sellerName,
  sucursales,
}: Props) {
  return (
    <Drawer
      title={`Detalle por sucursal - ${sellerName ?? ""}`}
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Table
        dataSource={sucursales.map((s, i) => ({ ...s, key: i }))}
        columns={columns}
        pagination={false}
      />
    </Drawer>
  );
}
