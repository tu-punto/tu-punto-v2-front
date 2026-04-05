import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import {
  createRecurringExpenseAPI,
  deleteRecurringExpenseAPI,
  getRecurringExpensesAPI,
  payRecurringExpenseAPI,
  updateRecurringExpenseAPI,
} from "../../api/recurringExpense";
import { getSucursalsAPI } from "../../api/sucursal";

type RecurringExpensesModalProps = {
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

type RecurringRow = {
  key: string;
  _id?: string;
  tipo: string;
  detalle: string;
  monto: number | null;
  id_sucursal: string;
  hasta_cuando_se_pago: string | null;
  isNew?: boolean;
};

const GLOBAL_BRANCH_VALUE = "global";

const normalizeText = (value: unknown) => String(value ?? "").trim();

const toEditableRow = (row: any): RecurringRow => ({
  key: String(row?._id || crypto.randomUUID()),
  _id: row?._id ? String(row._id) : undefined,
  tipo: normalizeText(row?.tipo),
  detalle: normalizeText(row?.detalle),
  monto: Number.isFinite(Number(row?.monto)) ? Number(row.monto) : null,
  id_sucursal: row?.id_sucursal?._id ? String(row.id_sucursal._id) : GLOBAL_BRANCH_VALUE,
  hasta_cuando_se_pago: row?.hasta_cuando_se_pago ? String(row.hasta_cuando_se_pago) : null,
  isNew: false,
});

const buildPayload = (row: RecurringRow) => {
  const tipo = normalizeText(row.tipo);
  const detalle = normalizeText(row.detalle);
  const monto = Number(row.monto);
  const paidUntil = row.hasta_cuando_se_pago ? dayjs(row.hasta_cuando_se_pago) : null;

  if (!tipo) {
    throw new Error("El tipo es obligatorio.");
  }
  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error("El monto es invalido.");
  }
  if (!paidUntil || !paidUntil.isValid()) {
    throw new Error("Debes seleccionar hasta cuando se pago.");
  }

  return {
    tipo,
    detalle,
    monto,
    id_sucursal: row.id_sucursal === GLOBAL_BRANCH_VALUE ? null : row.id_sucursal,
    hasta_cuando_se_pago: paidUntil.toISOString(),
  };
};

const RecurringExpensesModal = ({ open, onClose, onPaid }: RecurringExpensesModalProps) => {
  const [rows, setRows] = useState<RecurringRow[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [payingRowKey, setPayingRowKey] = useState<string | null>(null);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);

  const branchOptions = useMemo(
    () => [
      { value: GLOBAL_BRANCH_VALUE, label: "Global" },
      ...branches.map((branch: any) => ({
        value: String(branch._id),
        label: branch.nombre,
      })),
    ],
    [branches]
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [recurringExpenses, sucursales] = await Promise.all([
          getRecurringExpensesAPI(),
          getSucursalsAPI(),
        ]);

        if (cancelled) return;

        setRows((Array.isArray(recurringExpenses) ? recurringExpenses : []).map(toEditableRow));
        setBranches(Array.isArray(sucursales) ? sucursales : []);
      } catch (error) {
        console.error("Error cargando gastos recurrentes:", error);
        message.error("No se pudieron cargar los gastos recurrentes.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const updateRow = (key: string, patch: Partial<RecurringRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        tipo: "",
        detalle: "",
        monto: null,
        id_sucursal: GLOBAL_BRANCH_VALUE,
        hasta_cuando_se_pago: dayjs().toISOString(),
        isNew: true,
      },
    ]);
  };

  const persistRow = async (row: RecurringRow) => {
    const payload = buildPayload(row);
    const response = row._id
      ? await updateRecurringExpenseAPI(row._id, payload)
      : await createRecurringExpenseAPI(payload);

    if (!response?.ok) {
      throw new Error(response?.message || "No se pudo guardar la fila.");
    }

    const savedRow = toEditableRow(response.updated || response.created);
    setRows((current) =>
      current.map((item) => (item.key === row.key ? savedRow : item))
    );

    return savedRow;
  };

  const handleSave = async (row: RecurringRow) => {
    setSavingRowKey(row.key);
    try {
      await persistRow(row);
      message.success("Fila guardada.");
    } catch (error: any) {
      message.error(error?.message || "No se pudo guardar la fila.");
    } finally {
      setSavingRowKey(null);
    }
  };

  const handleDelete = async (row: RecurringRow) => {
    if (!row._id) {
      setRows((current) => current.filter((item) => item.key !== row.key));
      return;
    }

    setDeletingRowKey(row.key);
    try {
      const response = await deleteRecurringExpenseAPI(row._id);
      if (!response?.ok) {
        throw new Error(response?.message || "No se pudo eliminar la fila.");
      }
      setRows((current) => current.filter((item) => item.key !== row.key));
      message.success("Fila eliminada.");
    } catch (error: any) {
      message.error(error?.message || "No se pudo eliminar la fila.");
    } finally {
      setDeletingRowKey(null);
    }
  };

  const handlePay = async (row: RecurringRow) => {
    setPayingRowKey(row.key);
    try {
      const savedRow = await persistRow({
        ...row,
        detalle: normalizeText(row.detalle) || normalizeText(row.tipo),
      });

      if (!savedRow._id) {
        throw new Error("No se pudo guardar el gasto recurrente antes de pagar.");
      }

      const response = await payRecurringExpenseAPI(savedRow._id);
      if (!response?.ok) {
        throw new Error(response?.message || "No se pudo registrar el gasto.");
      }

      setRows((current) =>
        current.map((item) =>
          item.key === savedRow.key ? toEditableRow(response.recurringExpense || savedRow) : item
        )
      );

      message.success("Gasto recurrente pagado y registrado en Gastos e Ingresos.");
      onPaid?.();
    } catch (error: any) {
      message.error(error?.message || "No se pudo pagar el gasto recurrente.");
    } finally {
      setPayingRowKey(null);
    }
  };

  const columns = [
    {
      title: "TIPO",
      dataIndex: "tipo",
      key: "tipo",
      width: 180,
      render: (_: any, record: RecurringRow) => (
        <Input
          value={record.tipo}
          onChange={(event) => updateRow(record.key, { tipo: event.target.value })}
          placeholder="Ej. Internet"
        />
      ),
    },
    {
      title: "SUCURSAL",
      dataIndex: "id_sucursal",
      key: "id_sucursal",
      width: 180,
      render: (_: any, record: RecurringRow) => (
        <Select
          value={record.id_sucursal}
          onChange={(value) => updateRow(record.key, { id_sucursal: value })}
          options={branchOptions}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "MONTO",
      dataIndex: "monto",
      key: "monto",
      width: 140,
      render: (_: any, record: RecurringRow) => (
        <InputNumber
          value={record.monto}
          min={0}
          step={0.01}
          precision={2}
          style={{ width: "100%" }}
          onChange={(value) =>
            updateRow(record.key, { monto: value === null ? null : Number(value) })
          }
        />
      ),
    },
    {
      title: "DETALLE",
      dataIndex: "detalle",
      key: "detalle",
      width: 220,
      render: (_: any, record: RecurringRow) => (
        <Input
          value={record.detalle}
          onChange={(event) => updateRow(record.key, { detalle: event.target.value })}
          placeholder="Opcional"
        />
      ),
    },
    {
      title: "HASTA CUANDO SE PAGO",
      dataIndex: "hasta_cuando_se_pago",
      key: "hasta_cuando_se_pago",
      width: 190,
      render: (_: any, record: RecurringRow) => (
        <DatePicker
          value={record.hasta_cuando_se_pago ? dayjs(record.hasta_cuando_se_pago) : null}
          format="DD/MM/YYYY"
          style={{ width: "100%" }}
          onChange={(value) =>
            updateRow(record.key, {
              hasta_cuando_se_pago: value ? value.toISOString() : null,
            })
          }
        />
      ),
    },
    {
      title: "ACCIONES",
      key: "acciones",
      width: 260,
      fixed: "right" as const,
      render: (_: any, record: RecurringRow) => (
        <Space wrap>
          <Button
            type="primary"
            onClick={() => void handlePay(record)}
            loading={payingRowKey === record.key}
          >
            Pagar
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={() => void handleSave(record)}
            loading={savingRowKey === record.key}
          />
          <Popconfirm
            title="Eliminar fila"
            description="Esta accion quitara el gasto recurrente de la tabla."
            onConfirm={() => void handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} loading={deletingRowKey === record.key} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="Gastos recurrentes"
      open={open}
      onCancel={onClose}
      width={1280}
      footer={null}
      destroyOnClose
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ color: "#595959" }}>
          Configura filas recurrentes y usa <b>Pagar</b> para registrar el gasto en <b>Gastos e Ingresos</b>.
        </div>
        <Button type="primary" onClick={addRow}>
          Agregar fila
        </Button>
      </div>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: 1180 }}
        locale={{ emptyText: "No hay gastos recurrentes configurados." }}
      />
    </Modal>
  );
};

export default RecurringExpensesModal;
