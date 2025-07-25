import React from "react";
import { Table } from "antd";

type Servicio = "Almacenamiento" | "Exhibición" | "Entregas Simples" | "Delivery";

type SummaryData = Record<
  string,
  {
    Almacenamiento: number;
    Exhibición: number;
    "Entregas Simples": number;
    Delivery: number;
    TOTAL: number;
  }
>;

type Props = {
  summary: SummaryData;
  allSucursals: string[];
};

export default function ServiciosResumenTable({ summary, allSucursals }: Props) {
  const sucursales = allSucursals;
  const servicios: Servicio[] = ["Almacenamiento", "Exhibición", "Entregas Simples", "Delivery"];

  const rows = servicios.map((servicio) => {
    const row: Record<string, any> = {
      key: servicio,
      servicio,
    };

    sucursales.forEach((sucursal) => {
      row[sucursal] = summary[sucursal]?.[servicio] || 0;
    });

    row.total = summary.TOTAL?.[servicio] || 0;

    return row;
  });

  const totalRow: Record<string, any> = {
    key: "total",
    servicio: "TOTAL",
  };

  sucursales.forEach((sucursal) => {
    totalRow[sucursal] = summary[sucursal]?.TOTAL || 0;
  });

  totalRow.total = summary.TOTAL?.TOTAL || 0;
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
      render: (val: number) => (
        <span>{val !== 0 ? val.toFixed(2) : "-"}</span>
      ),
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
      pagination={false}
      bordered
    />
  );
}