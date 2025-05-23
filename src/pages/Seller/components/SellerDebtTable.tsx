import { Table } from 'antd';
import dayjs from 'dayjs';

const columns = [
  {
    title: 'Fecha',
    dataIndex: 'fecha',
    key: 'fecha',
    render: (val: string) => dayjs(val).format('DD/MM/YYYY'),
  },
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
