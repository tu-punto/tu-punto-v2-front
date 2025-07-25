import { Table, Input, Button, Switch } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { updateFinanceFluxAPI } from '../../../api/financeFlux';

export default function SellerDebtTable({ data, setRefreshKey, isSeller}: { data: any[], setRefreshKey: (key: number) => void, isSeller: boolean }) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<any>({});

  const isEditing = (record: any) => record._id === editingKey;

  const handleEdit = (record: any) => {
    setEditingKey(record._id);
    setEditingRow({ ...record });
  };

  const handleSave = async () => {
    const res = await updateFinanceFluxAPI(editingKey!, {
      ...editingRow
    })
    setEditingKey(null);
    setRefreshKey((prevKey) => prevKey + 1); 
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditingRow({});
  };

  const handleChange = (key: string, value: any) => {
    setEditingRow({ ...editingRow, [key]: value });
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (val: string, record: any) => {
        const editable = isEditing(record);
        return editable ? (
          <Input
            type='date'
            defaultValue={dayjs(val).format('YYYY-MM-DD')}
            onChange={(e) => handleChange('fecha', e.target.value)}
          />
        ) : (
          dayjs(val).format('DD/MM/YYYY')
        );
      },
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      render: (val: number, record: any) => {
        const editable = isEditing(record);
        return editable ? (
          <Input
            type="number"
            defaultValue={val}
            onChange={(e) => handleChange('monto', e.target.value)}
          />
        ) : (
          `Bs. ${val}`
        );
      },
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      render: (text: string, record: any) => {
        const editable = isEditing(record);
        return editable ? (
          <Input
            defaultValue={text}
            onChange={(e) => handleChange('concepto', e.target.value)}
          />
        ) : (
          text
        );
      },
    },
    {
      title: '¿Es deuda?',
      dataIndex: 'esDeuda',
      key: 'esDeuda',
      render: (val: any, record: any) => {
        const editable = isEditing(record);
        return editable ? (
          <Switch
            checked={editingRow.esDeuda !== undefined ? editingRow.esDeuda : val}
            onChange={(checked) => handleChange('esDeuda', checked)}
            checkedChildren="Sí"
            unCheckedChildren="No"
          />
        ) : (
            <span>
            {val ? 'Sí' : 'No'}
            </span>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: any) => {
        if (isSeller) return null;
        const editable = isEditing(record);
        return editable ? (
          <div className="flex gap-2">
            <Button type="primary" onClick={handleSave}>
              Confirmar
            </Button>
            <Button onClick={handleCancel}>Cancelar</Button>
          </div>
        ) : (
          <Button type="link" onClick={() => handleEdit(record)}>
            Editar
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h4 className="text-lg font-bold mb-2">Registro de Deudas</h4>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="_id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} de ${total} registros`,
          pageSize: 5,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        size="small"
      />
    </div>
  );
}
