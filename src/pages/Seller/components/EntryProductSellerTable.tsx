import { Select, Table } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

interface EntryProductSellerTableProps {
  data: any[];
}
const EntryProductSellerTable = ({
  data,
}: EntryProductSellerTableProps) => {
  const [selectedBranch, setSelectedBranch] = useState<string>();

  const columns = [
    {
      title: "Fecha",
      dataIndex: "fecha_ingreso",
      key: "fecha_ingreso",
      render: (text: string) => {
        return dayjs(text).format('DD/MM/YYYY');
      },
      sorter: (a: any, b: any) => dayjs(a.fecha_ingreso).valueOf() - dayjs(b.fecha_ingreso).valueOf(),
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    {
      title: "Sucursal",
      dataIndex: "nombreSucursal",
      key: "nombre_sucursal",
      sorter: (a: any, b: any) =>
        String(a.nombreSucursal || "").localeCompare(String(b.nombreSucursal || "")),
      className: "text-mobile-sm xl:text-desktop-sm"

    },
    {
      title: "Producto",
      dataIndex: "nombre_variante",
      key: "nombre_variante",
      sorter: (a: any, b: any) =>
        String(a.nombre_variante || "").localeCompare(String(b.nombre_variante || "")),
      className: "text-mobile-sm xl:text-desktop-sm"
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad_ingreso",
      key: "cantidad_ingreso",
      width: '120px',
      sorter: (a: any, b: any) => Number(a.cantidad_ingreso || 0) - Number(b.cantidad_ingreso || 0),
      className: "text-mobile-sm xl:text-desktop-sm"
    },
  ];

  const branchOptions = useMemo(
    () =>
      Array.from(new Set(data.map((entry) => entry.nombreSucursal).filter(Boolean))).map((branch) => ({
        label: branch,
        value: branch,
      })),
    [data]
  );

  const filteredData = useMemo(
    () => data.filter((entry) => !selectedBranch || entry.nombreSucursal === selectedBranch),
    [data, selectedBranch]
  );

  return (
    <div>
      <Select
        allowClear
        placeholder="Todas las sucursales"
        options={branchOptions}
        style={{ width: 260, marginBottom: 16 }}
        value={selectedBranch}
        onChange={setSelectedBranch}
      />
      <Table columns={columns} dataSource={filteredData} pagination={{ pageSize: 5 }} />
    </div>
  );

}
export default EntryProductSellerTable
