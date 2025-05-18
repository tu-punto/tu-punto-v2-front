import { Table } from 'antd';

const columns = [
  {
    title: 'Monto',
    dataIndex: 'monto',
    key: 'monto',
    render: (val: number) => `Bs. ${val}`,
  },
  {
    title: 'Concepto',
    dataIndex: 'concepto',
    key: 'concepto',
  },
];

export default function SellerDebtTable({ data }: { data: any[] }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h4 className="text-lg font-bold mb-2">Registro de Deudas</h4>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="_id"
        pagination={false}
        size="small"
      />
    </div>
  );
}
