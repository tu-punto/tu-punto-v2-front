import { Button, InputNumber, Table } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { EditableCellInputNumber } from "../../components/editableCell";

interface EntryProductSellerTableProps {
  data: any[];
  handleValueChange: (key: any, field: any, value: any) => void;
  onDeleteProduct: (key: string, isEntryProduct: boolean) => void;
  isAdmin: boolean;
}
const EntryProductSellerTable = ({
  data,
  handleValueChange,
  onDeleteProduct,
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
      render: (_: any, record: any) => (
        <EditableCellInputNumber
          isAdmin={isAdmin}
          value={record.cantidad_ingreso || 0}
          min={0}
          onChange={(value) => handleValueChange(record.key, "cantidad_ingreso", value)}
        />
      ),
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    ...(isAdmin
      ? [
        {
          title: "Acción",
          key: "action",
          render: (_: any, record: any) => (
            <Button type="link" onClick={() => onDeleteProduct(record.key, true)}>
              Eliminar
            </Button>
          ),
          className: "text-mobile-sm xl:text-desktop-sm"
        },
      ]
      : []),
  ];
  useEffect(() => {

  }, [data]);
  return (
    <div>
      <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} />
    </div>
  );

}
export default EntryProductSellerTable
