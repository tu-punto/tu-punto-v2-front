import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Typography,
  Table,
  Row,
  Col,
  message,
  Select,
  Modal
} from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { IBoxClose } from "../../models/boxClose";
import { getDailySummary, IDailySummary } from "../../helpers/shippingHelpers";
import { registerBoxCloseAPI, updateBoxCloseAPI } from "../../api/boxClose";
import { getAdminsAPI } from "../../api/user";
const { Title } = Typography;
type Metodo = "efectivo" | "qr";
type TipoOperacion = "delivery" | "gasto_profit" | "pago_cliente";

interface OperacionAdicional {
  tipo: TipoOperacion;
  descripcion: string;
  cliente?: string;
  metodo: Metodo;
  monto: number;
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  lastClosingBalance?: any;
  selectedDate?: dayjs.Dayjs | null;
  mode?: "create" | "edit" | "view";
  initialData?: IBoxClose;
}

const BoxCloseForm = ({
  onSuccess,
  onCancel,
  lastClosingBalance = { efectivo_real: 0 },
  selectedDate,
  mode = "create",
  initialData,
}: Props) => {
  const [coinTotals, setCoinTotals] = useState(0);
  const [billTotals, setBillTotals] = useState(0);
  const [salesSummary, setSalesSummary] = useState<IDailySummary>();
  const [form] = Form.useForm<IBoxClose>();
  const coins = Form.useWatch("coins", form) || {};
  const bills = Form.useWatch("bills", form) || {};
  const [admins, setAdmins] = useState<{ _id: string; name: string }[]>([]);
  const [operations, setOperations] = useState<OperacionAdicional[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [operationForm] = Form.useForm();
  function recalcExpectedAndDiffs(ops: OperacionAdicional[]) {
    const iniEf   = Number(form.getFieldValue("efectivo_inicial") || 0);
    const ventasE = Number(form.getFieldValue("ventas_efectivo")   || 0);

    const iniQr   = Number(form.getFieldValue("bancario_inicial")  || 0);
    const ventasQ = Number(form.getFieldValue("ventas_qr")         || 0);

    // deltas por método, según tipo
    let deltaEf = 0;
    let deltaQr = 0;
    let cambiosExternos = 0; // visible en el UI si quieres mantenerlo

    for (const o of ops) {
      const sign = o.tipo === "gasto_profit" ? -1 : 1; // gasto -> resta, delivery/pago_cliente -> suma
      if (o.metodo === "efectivo") deltaEf += sign * o.monto;
      else                         deltaQr += sign * o.monto;

      cambiosExternos += sign * o.monto; // agregas como resumen visible
    }

    const efectivoEsperado = iniEf + ventasE + cambiosExternos + deltaEf;
    const bancarioEsperado = iniQr + ventasQ + deltaQr;

    form.setFieldValue("cambios_externos", Number(cambiosExternos.toFixed(2)));
    form.setFieldValue("efectivo_esperado", Number(efectivoEsperado.toFixed(2)));
    form.setFieldValue("bancario_esperado", Number(bancarioEsperado.toFixed(2)));

    // actualizar diferencias contra los reales actuales
    const efectivoReal  = Number(form.getFieldValue("efectivo_real")  || 0);
    const bancarioReal  = Number(form.getFieldValue("bancario_real")  || 0);

    form.setFieldValue("diferencia_efectivo", Number((efectivoReal - efectivoEsperado).toFixed(2)));
    form.setFieldValue("diferencia_bancario", Number((bancarioReal - bancarioEsperado).toFixed(2)));
  }
  useEffect(() => {
    const fetchAdmins = async () => {
      const data = await getAdminsAPI();
      if (data) setAdmins(data);
    };
    fetchAdmins();
  }, []);
  const fetchSalesSummary = async () => {
    try {
      const summary = await getDailySummary(selectedDate?.toISOString());
      setSalesSummary(summary || { cash: 0, bank: 0, total: 0 });
      const efectivoInicial = parseFloat(lastClosingBalance.efectivo_real) || 0;
      const cambiosExternos = form.getFieldValue("cambios_externos") || 0;
      const efectivoEsperado = efectivoInicial + (summary?.cash || 0) + cambiosExternos;

      form.setFieldsValue({
        efectivo_inicial: efectivoInicial,
        bancario_inicial: 0,
        ventas_efectivo: summary?.cash || 0,
        ventas_qr: summary?.bank || 0,
        efectivo_esperado: efectivoEsperado,
        bancario_esperado: summary?.bank,
      });
      recalcExpectedAndDiffs(operations);
    } catch (error) {
      console.error("Error while fetching sales summary", error);
      setSalesSummary({ cash: 0, bank: 0, total: 0 });
    }
  };

  const efectivoInicial = Form.useWatch("efectivo_inicial", form) || 0;
  const ventas = Form.useWatch("ventas_efectivo", form) || 0;
  const cambios = Form.useWatch("cambios_externos", form) || 0;

  useEffect(() => {
    const esperado = efectivoInicial + ventas + cambios;
    form.setFieldValue("efectivo_esperado", esperado.toFixed(2));
  }, [efectivoInicial, ventas, cambios]);

  useEffect(() => {
    const total = Object.entries(coins).reduce(
        (sum, [denom, qty]) => sum + (parseFloat(denom) * (qty || 0)),
        0
    );
    setCoinTotals(total);
  }, [coins]);

  useEffect(() => {
    const total = Object.entries(bills).reduce(
        (sum, [denom, qty]) => sum + (parseFloat(denom) * (qty || 0)),
        0
    );
    setBillTotals(total);
  }, [bills]);
  useEffect(() => {
    const efectivoReal = coinTotals + billTotals;
    form.setFieldValue("efectivo_real", Number(efectivoReal.toFixed(2)));
    recalcExpectedAndDiffs(operations);
  }, [coinTotals, billTotals]);
  useEffect(() => {
    recalcExpectedAndDiffs(operations);
  }, [Form.useWatch("bancario_real", form)]);
  useEffect(() => {
    recalcExpectedAndDiffs(operations);
  }, [Form.useWatch("efectivo_inicial", form), Form.useWatch("ventas_efectivo", form),
    Form.useWatch("bancario_inicial", form), Form.useWatch("ventas_qr", form)]);

  useEffect(() => {
    if (mode !== "edit") {
      fetchSalesSummary();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    const efectivo_diario = initialData.efectivo_diario || [];
    const coinsValues: Record<string, number> = {};
    const billsValues: Record<string, number> = {};

    efectivo_diario.forEach((item: any) => {
      const key = String(item.corte);
      if (item.corte < 10) coinsValues[key] = item.cantidad || 0;
      else billsValues[key] = item.cantidad || 0;
    });

    const responsableValue = initialData.responsable
      ? {
          value: (initialData.responsable as any).id || (initialData.responsable as any)._id,
          label: (initialData.responsable as any).nombre || (initialData.responsable as any).name || "",
        }
      : undefined;

    setOperations(initialData.operaciones_adicionales || []);
    setSalesSummary({
      cash: initialData.ventas_efectivo || 0,
      bank: initialData.ventas_qr || 0,
      total: (initialData.ventas_efectivo || 0) + (initialData.ventas_qr || 0),
    });

    form.setFieldsValue({
      responsable: responsableValue,
      efectivo_inicial: initialData.efectivo_inicial || 0,
      bancario_inicial: initialData.bancario_inicial || 0,
      ventas_efectivo: initialData.ventas_efectivo || 0,
      ventas_qr: initialData.ventas_qr || 0,
      efectivo_esperado: initialData.efectivo_esperado || 0,
      bancario_esperado: initialData.bancario_esperado || 0,
      efectivo_real: initialData.efectivo_real || 0,
      bancario_real: initialData.bancario_real || 0,
      diferencia_efectivo: initialData.diferencia_efectivo || 0,
      diferencia_bancario: initialData.diferencia_bancario || 0,
      cambios_externos: initialData.cambios_externos || 0,
      observaciones: initialData.observaciones || "",
      coins: coinsValues,
      bills: billsValues,
    });

    const totalCoins = Object.entries(coinsValues).reduce(
      (sum, [denom, qty]) => sum + parseFloat(denom) * (qty || 0),
      0
    );
    const totalBills = Object.entries(billsValues).reduce(
      (sum, [denom, qty]) => sum + parseFloat(denom) * (qty || 0),
      0
    );
    setCoinTotals(totalCoins);
    setBillTotals(totalBills);
    recalcExpectedAndDiffs(initialData.operaciones_adicionales || []);
  }, [mode, initialData, form]);

  useEffect(() => {
    const efectivoEsperado = form.getFieldValue("efectivo_esperado") || 0;
    const efectivoReal = coinTotals + billTotals;
    const bancarioEsperado = form.getFieldValue("bancario_esperado") || 0;
    const bancarioReal = form.getFieldValue("bancario_real") || 0;

    form.setFieldValue("efectivo_real", efectivoReal.toFixed(2));
    form.setFieldValue("diferencia_efectivo", (efectivoReal - efectivoEsperado).toFixed(2));
    form.setFieldValue("diferencia_bancario", (bancarioReal - bancarioEsperado).toFixed(2));
  }, [coinTotals, billTotals, Form.useWatch("bancario_real", form), Form.useWatch("bancario_esperado", form)]);

  const openOperationModal = () => {
    setModalVisible(true);
  };

  const closeOperationModal = () => {
    setModalVisible(false);
    operationForm.resetFields();
  };

  const handleAddOperation = async () => {
    try {
      const newOp = await operationForm.validateFields();
      const op: OperacionAdicional = {
        ...newOp,
        monto: Math.abs(Number(newOp.monto || 0)), // siempre positivo
      };

      const updatedOperations = [...operations, op];
      setOperations(updatedOperations);

      // recalcular campos derivados
      recalcExpectedAndDiffs(updatedOperations);

      closeOperationModal();
    } catch (err) {
      console.error("Error al añadir operación:", err);
    }
  };
  const handleDeleteOperation = (index: number) => {
    const updated = operations.filter((_, i) => i !== index);
    setOperations(updated);
    recalcExpectedAndDiffs(updated);
  };

  const handleSubmit = async (values: any) => {
    try {
      const { coins, bills, ...boxCloseValues } = values;

      const efectivo_diario = [
        ...Object.entries(coins).map(([denom, qty]) => ({
          corte: parseFloat(denom),
          cantidad: qty || 0,
        })),
        ...Object.entries(bills).map(([denom, qty]) => ({
          corte: parseFloat(denom),
          cantidad: qty || 0,
        })),
      ];

      if (mode === "edit" && initialData?._id) {
        const updatePayload = {
          efectivo_real: form.getFieldValue("efectivo_real"),
          diferencia_efectivo: form.getFieldValue("diferencia_efectivo"),
          observaciones: form.getFieldValue("observaciones") || "",
          efectivo_diario,
          operaciones_adicionales: operations,
        };

        await updateBoxCloseAPI(initialData._id, updatePayload);
      } else {
        const newBoxClose = {
          ...boxCloseValues,
          responsable: {
            id: values.responsable.value,
            nombre: values.responsable.label,
          },
          cambios_externos: form.getFieldValue("cambios_externos") || 0,
          ingresos_efectivo: form.getFieldValue("ventas_efectivo"),
          ventas_efectivo: salesSummary?.cash ?? 0,
          ventas_qr:       salesSummary?.bank ?? 0,
          id_sucursal: localStorage.getItem("sucursalId"),
          efectivo_diario,
          operaciones_adicionales: operations,
        };

        await registerBoxCloseAPI(newBoxClose);
      }

      message.success("Proceso completado con éxito.");
      onSuccess();
    } catch (error) {
      console.error("Error saving reconciliation:", error);
      message.error("Error al intentar registrar el cierre de caja.");
    }
  };
  const coinDenominations = {
    "0.1": "10 ctvs.",
    "0.2": "20 ctvs.",
    "0.5": "50 ctvs.",
    "1": "Bs. 1",
    "2": "Bs 2",
    "5": "Bs 5",
  };
  const billDenominations = {
    "10": "Bs. 10",
    "20": "Bs. 20",
    "50": "Bs. 50",
    "100": "Bs. 100",
    "200": "Bs. 200",
  };

  return (
      <>
        <Button onClick={openOperationModal}>Añadir operación adicional</Button>
        {operations.length > 0 && (
            <Table
                dataSource={operations}
                columns={[
                  { title: "Tipo", dataIndex: "tipo", key: "tipo" },
                  { title: "Método", dataIndex: "metodo", key: "metodo" },
                  { title: "Cliente", dataIndex: "cliente", key: "cliente", render: (v) => v || "-" },
                  { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
                  { title: "Monto", dataIndex: "monto", key: "monto", render: (monto) => `Bs. ${Number(monto).toFixed(2)}` },
                  {
                    title: "Acciones",
                    key: "acciones",
                    render: (_, __, index) => (
                        <Button danger size="small" onClick={() => handleDeleteOperation(index)}>
                          Eliminar
                        </Button>
                    )
                  }
                ]}
                rowKey={(_, i) => i!.toString()}
                pagination={false}
                size="small"
                style={{ marginTop: 16 }}
            />
        )}
        <Modal
            title="Nueva operación"
            open={modalVisible}
            onOk={handleAddOperation}
            onCancel={closeOperationModal}
        >
          <Form form={operationForm} layout="vertical">
            <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
              <Select
                  options={[
                    { value: "delivery",     label: "Delivery (Entrada)" },
                    { value: "gasto_profit", label: "Gasto Profit (Salida)" },
                    { value: "pago_cliente", label: "Pago de Cliente (Entrada)" },
                  ]}
              />
            </Form.Item>

            <Form.Item name="metodo" label="Método" rules={[{ required: true }]}>
              <Select
                  options={[
                    { value: "efectivo", label: "Efectivo" },
                    { value: "qr",       label: "QR/Bancario" },
                  ]}
              />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => {
                const t = operationForm.getFieldValue("tipo");
                return t === "pago_cliente" ? (
                    <Form.Item name="cliente" label="Cliente" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                ) : null;
              }}
            </Form.Item>

            <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            <Form.Item name="monto" label="Monto" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Form>
        </Modal>
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-4">
        <Card>
          <Title level={5}>Información General</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Responsable"
                name="responsable"
                rules={[{ required: true, message: "Campo requerido" }]}
              >
                <Select
                  placeholder="Selecciona un responsable"
                  labelInValue
                  disabled={mode === "edit"}
                  onChange={(option) => {
                    form.setFieldValue("responsable", option); // <- ¡simplemente esto!
                  }}
                  options={admins.map((admin) => ({
                    label: admin.name,
                    value: admin._id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Fecha">
                <Input
                  readOnly
                  disabled={mode === "edit"}
                  value={
                    mode === "edit" && initialData?.created_at
                      ? dayjs(initialData.created_at).format("DD/MM/YYYY")
                      : dayjs().format("DD/MM/YYYY")
                  }
                  className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card>
          <Title level={5}>Resumen de Ventas</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Último cierre de caja (Efectivo)">
                <InputNumber
                    value={lastClosingBalance.efectivo_real}
                    readOnly
                    prefix="Bs. "
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Efectivo">
                <InputNumber
                    value={salesSummary?.cash}
                    readOnly
                    prefix="Bs. "
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Bancario">
                <InputNumber
                    value={salesSummary?.bank}
                    readOnly
                    prefix="Bs. "
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Total">
                <InputNumber
                    value={salesSummary?.total}
                    readOnly
                    prefix="Bs. "
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                  label="Cambios Externos"
                  name="cambios_externos"
                  rules={[{ required: true, message: "Campo requerido" }]}
              >
                <InputNumber
                    min={0}
                    prefix="Bs. "
                    className="w-full"

                />
              </Form.Item>
            </Col>

          </Row>
        </Card>

        <Card>
          <Title level={5}>Recuento de Efectivo</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Efectivo inicial" name="efectivo_inicial">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ingresos en efectivo" name="ventas_efectivo">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Efectivo esperado" name="efectivo_esperado">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Efectivo real" name="efectivo_real">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Diferencia" name="diferencia_efectivo">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          <Col span={12}>
            <Card>
              <Title level={5}>Monedas</Title>
              <Table
                  dataSource={Object.entries(coinDenominations).map(([value, name]) => ({
                    value,
                    name,
                  }))}
                  columns={[
                    { title: "Denominación", dataIndex: "name", key: "name" },
                    {
                      title: "Cantidad",
                      key: "cantidad",
                      render: (_, record) => (
                          <Form.Item name={["coins", record.value]} noStyle>
                            <InputNumber min={0} />
                          </Form.Item>
                      ),
                    },
                    {
                      title: "Total",
                      key: "total",
                      render: (_, record) => {
                        const qty = form.getFieldValue(["coins", record.value]) || 0;
                        return `Bs. ${(qty * parseFloat(record.value)).toFixed(2)}`;
                      },
                    },
                  ]}
                  pagination={false}
                  size="small"
                  summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell colSpan={2}>
                          <strong>Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell>
                          <strong>Bs. {coinTotals.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                  )}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Title level={5}>Billetes</Title>
              <Table
                  dataSource={Object.entries(billDenominations).map(([value, name]) => ({
                    value,
                    name,
                  }))}
                  columns={[
                    { title: "Denominación", dataIndex: "name", key: "name" },
                    {
                      title: "Cantidad",
                      key: "cantidad",
                      render: (_, record) => (
                          <Form.Item name={["bills", record.value]} noStyle>
                            <InputNumber min={0} />
                          </Form.Item>
                      ),
                    },
                    {
                      title: "Total",
                      key: "total",
                      render: (_, record) => {
                        const qty = form.getFieldValue(["bills", record.value]) || 0;
                        return `Bs. ${(qty * parseFloat(record.value)).toFixed(2)}`;
                      },
                    },
                  ]}
                  pagination={false}
                  size="small"
                  summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell colSpan={2}>
                          <strong>Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell>
                          <strong>Bs. {billTotals.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                  )}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Title level={5}>Recuento Bancario</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Bancario inicial" name="bancario_inicial">
                <InputNumber prefix="Bs. " className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ingresos bancarios" name="ventas_qr">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bancario esperado" name="bancario_esperado">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bancario real" name="bancario_real">
                <InputNumber prefix="Bs. " className="w-full" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Diferencia" name="diferencia_bancario">
                <InputNumber
                    prefix="Bs. "
                    readOnly
                    className="w-full bg-gray-200 text-gray-700"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card>
          <Title level={5}>Observaciones</Title>
          <Form.Item
              name="observaciones"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Card>

        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="primary" htmlType="submit">
            Guardar
          </Button>
        </div>
      </Form>
      </>
  );
};

export default BoxCloseForm;
