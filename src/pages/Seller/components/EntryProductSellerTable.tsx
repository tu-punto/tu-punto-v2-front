import {  Table } from "antd";
import dayjs from "dayjs";

interface EntryProductSellerTableProps {
  data: any[];
}
const EntryProductSellerTable = ({
  data,
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
      title: "Sucursal",
      dataIndex: "nombreSucursal",
      key: "nombre_sucursal",
      className: "text-mobile-sm xl:text-desktop-sm"

    },
    {
      title: "Producto",
      dataIndex: "nombre_variante",
      key: "nombre_variante",
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
