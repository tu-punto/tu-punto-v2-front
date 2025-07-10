import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Table, Empty, Select, Row } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, useMemo } from "react";
import { EditableCellInputNumber } from "../../components/editableCell";

interface CustomTableProps {
  data: any[];
  onDeleteProduct: (rowKey: string, id: string) => void;
  onUpdateProduct: (id: string, fields: any) => void;
  handleValueChange: (key: any, field: any, value: any) => void;
  showClient: boolean;
  allowActions?: boolean;
  onUpdateTotalAmount: (total: number) => void;
  isAdmin: boolean;
}

const CustomTable = ({
  data,
  onDeleteProduct,
  onUpdateProduct,
  onUpdateTotalAmount,
  handleValueChange,
  showClient,
  allowActions = false,
  isAdmin,
}: CustomTableProps) => {
  const [selectedSucursal, setSelectedSucursal] = useState("todos");

  // Filtrar datos
  const filteredData = useMemo(() => {
    return selectedSucursal === "todos"
      ? data
      : data.filter((sale) => sale.sucursal === selectedSucursal);
  }, [data, selectedSucursal]);

  // Sucursales únicas
  const sucursales = useMemo(() => {
    return [...new Set(data.map((s) => s.sucursal))];
  }, [data]);

  // Total de productos
  const totalProductos = filteredData.reduce(
    (sum, sale) => sum + (sale.cantidad || 0),
    0
  );

  const totalAmount = filteredData.reduce((acc, product) => {
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
        return dayjs(text).format("DD/MM/YYYY");
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Producto",
      dataIndex: "nombre_variante",
      key: "producto",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Sucursal",
      dataIndex: "sucursal",
      key: "sucursal",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Subtotal deudas",
      key: "subtotal_deudas",
      dataIndex: "subtotal_deudas",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, record: any) => {
        const subtotalVenta = record.cantidad * record.precio_unitario;
        const subtotalDeudas = record.id_pedido.pagado_al_vendedor
          ? -record.utilidad
          : subtotalVenta - record.utilidad;
        return `Bs. ${subtotalDeudas.toFixed(2)}`;
      },
    },
    {
      title: "Utilidad",
      dataIndex: "utilidad",
      key: "utilidad",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, record: any) =>
        allowActions ? (
          <EditableCellInputNumber
            isAdmin={isAdmin}
            value={record.utilidad}
            min={0}
            onChange={(value) =>
              handleValueChange(record.key, "utilidad", value)
            }
          />
        ) : (
          `Bs. ${record.utilidad}`
        ),
    },
    {
      title: "Precio Unitario",
      dataIndex: "precio_unitario",
      key: "precio_unitario",
      render: (_: any, record: any) =>
        allowActions ? (
          <EditableCellInputNumber
            isAdmin={isAdmin}
            value={record.precio_unitario}
            min={0}
            onChange={(value) => {
              handleValueChange(record.key, "precio_unitario", value);

              const comision = Number(record.comision_porcentual || 0);
              const cantidad = Number(record.cantidad || 0);
              const newUtilidad = parseFloat(
                ((value * cantidad * comision) / 100).toFixed(2)
              );

              handleValueChange(record.key, "utilidad", newUtilidad);
            }}
          />
        ) : (
          `Bs. ${record.precio_unitario}`
        ),
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      render: (_: any, record: any) =>
        allowActions ? (
          <EditableCellInputNumber
            isAdmin={isAdmin}
            value={record.cantidad}
            min={0}
            onChange={(value) => {
              handleValueChange(record.key, "cantidad", value);

              const comision = Number(record.comision_porcentual || 0);
              const precio = Number(record.precio_unitario || 0);
              const newUtilidad = parseFloat(
                ((precio * value * comision) / 100).toFixed(2)
              );

              handleValueChange(record.key, "utilidad", newUtilidad);
            }}
          />
        ) : (
          record.cantidad
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
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    ...(isAdmin && allowActions
      ? [
          {
            title: "Acción",
            key: "action",
            render: (_: any, record: any) => (
              <div className="flex gap-2">
                {/* Confirmación de guardar */}
                <Popconfirm
                  title="¿Guardar cambios?"
                  okText="Guardar"
                  cancelText="Cancelar"
                  onConfirm={() => {
                    onUpdateProduct(record.id_venta, {
                      precio_unitario: record.precio_unitario,
                      cantidad: record.cantidad,
                      utilidad: record.utilidad,
                    });
                  }}
                >
                  <Button icon={<SaveOutlined />} size="small" type="text" />
                </Popconfirm>

                {/* Confirmación de eliminación */}
                <Popconfirm
                  title="¿Estás seguro de eliminar este producto?"
                  okText="Sí"
                  cancelText="No"
                  onConfirm={() => {
                    onDeleteProduct(record.key, record.id_venta);
                  }}
                >
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    type="text"
                    danger
                  />
                </Popconfirm>
              </div>
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
          },
        ]
      : []),
  ];

  useEffect(() => {
    onUpdateTotalAmount(totalAmount);
  }, [filteredData]);

  return filteredData.length > 0 ? (
    <>
      <Row justify="space-between" align="middle" className="my-4">
        <Select
          placeholder="Filtrar por sucursal"
          style={{ width: 200 }}
          value={selectedSucursal}
          onChange={setSelectedSucursal}
          options={[
            { value: "todos", label: "Todas las sucursales" },
            ...sucursales.map((sucursal) => ({
              value: sucursal,
              label: sucursal,
            })),
          ]}
        />
        <span className="text-mobile-sm xl:text-desktop-sm">
          <strong>Total productos: {totalProductos}</strong>
        </span>
      </Row>

      <div style={{ textAlign: "right" }}>
        <strong className="text-mobile-sm xl:text-desktop-sm">
          Monto Total:
        </strong>{" "}
        Bs.{totalAmount.toFixed(2)}
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 5 }}
      />
    </>
  ) : (
    <Empty
      description="No se encontraron ventas"
      className="text-mobile-sm xl:text-desktop-sm"
    />
  );
};

export default CustomTable;
