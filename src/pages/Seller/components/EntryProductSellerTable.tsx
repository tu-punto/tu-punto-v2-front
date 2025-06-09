import { Button, InputNumber, Table } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { EditableCellInputNumber } from "../../components/editableCell";

interface EntryProductSellerTableProps {
  data: any[];
  isAdmin: boolean;
}
const EntryProductSellerTable = ({
  data,
  isAdmin
}: EntryProductSellerTableProps) => {
  const columns = [
    {
      title: "Fecha",
      dataIndex: "fecha_ingreso",
      key: "fecha_ingreso",
      render: (text: string) => {
        return dayjs(text).format('DD/MM/YYYY');
      },
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    {
      title: "Producto",
      dataIndex: ["producto", "nombre_producto"],
      key: "nombre_producto",
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad_ingreso",
      key: "cantidad_ingreso",
      width: '120px',
      className: "text-mobile-sm xl:text-desktop-sm"
    },
  ];

  return (
    <div>
      <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} />
    </div>
  );

}
export default EntryProductSellerTable
