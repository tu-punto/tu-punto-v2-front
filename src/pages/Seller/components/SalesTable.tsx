import { Button, Table } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { EditableCellInputNumber } from "../../components/editableCell";

interface CustomTableProps {
  data: any[];
  onDeleteProduct: (key: string, isEntryProduct: boolean) => void;
  handleValueChange: (key: any, field: any, value: any) => void;
  showClient: boolean; // Propiedad para alternar entre cliente y tipo
  onUpdateTotalAmount: (total: number) => void;
  isAdmin: boolean;
}

const CustomTable = ({
  data,
  onDeleteProduct,
  onUpdateTotalAmount,
  handleValueChange,
  showClient,
  isAdmin,
}: CustomTableProps) => {
  const totalAmount = data.reduce((acc, product) => {
    const cantidad = product.cantidad || 0;
    const precio = product.precio_unitario || 0;
    return acc + precio * cantidad;
  }, 0);
  const columns = [
    {
      title: "Fecha",
      dataIndex: "fecha_pedido",
      key: "fecha_pedido",
      render: (text: string) => {
        return dayjs(text).format('DD/MM/YYYY');
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Producto",
      dataIndex: "producto",
      key: "producto",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Precio Unitario",
      dataIndex: "precio_unitario",
      key: "precio_unitario",
      render: (_: any, record: any) => (
        <EditableCellInputNumber
          isAdmin={isAdmin}
          value={record.precio_unitario}
          min={1}
          onChange={(value) => handleValueChange(record.key, "precio_unitario", value)}
        />
      ),
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      render: (_: any, record: any) => (
        <EditableCellInputNumber
          isAdmin={isAdmin}
          value={record.cantidad}
          min={1} 
          onChange={(value) => handleValueChange(record.key, "cantidad", value)}
        />
      ),
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Subtotal",
      dataIndex: "subtotal",
      key: "subtotal",
      render: (_: any, record: any) => {
        const subtotal = (record.cantidad || 0) * (record.precio_unitario || 0);
        return `Bs. ${subtotal.toFixed(2)}`;
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: showClient ? "Cliente" : "Tipo",
      dataIndex: showClient ? "cliente" : "tipo",
      key: showClient ? "cliente" : "tipo",
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    ...(isAdmin
      ? [
        {
          title: "Acción",
          key: "action",
          render: (_: any, record: any) => (
            <Button type="link" onClick={() => onDeleteProduct(record.key, false)}>
              Eliminar
            </Button>
          ),
          className: "text-mobile-sm xl:text-desktop-sm",
        },
      ]
      : []),
  ];

  useEffect(() => {
    onUpdateTotalAmount(totalAmount);
  }, [data]);

  return (
    <div>
      <div style={{ textAlign: "right" }}>
        <strong className="text-mobile-sm xl:text-desktop-sm">Monto Total:</strong> Bs.{totalAmount.toFixed(2)}
      </div>
      <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} />
    </div>
  );
};

export default CustomTable;
