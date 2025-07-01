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
} from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { IBoxClose } from "../../models/boxClose";
import { getDailySummary, IDailySummary } from "../../helpers/shippingHelpers";
import { registerBoxCloseAPI } from "../../api/boxClose";
import {
  registerDailyEffectiveAPI,
  updateDailyEffectiveAPI,
} from "../../api/dailyEffective";

const { Title } = Typography;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  lastClosingBalance?: any;
  selectedDate?: dayjs.Dayjs | null;
}

const BoxCloseForm = ({ onSuccess, onCancel, lastClosingBalance = "0", selectedDate }: Props) => {
  const [coinTotals, setCoinTotals] = useState(0);
  const [billTotals, setBillTotals] = useState(0);
  const [salesSummary, setSalesSummary] = useState<IDailySummary>();
  const [form] = Form.useForm<IBoxClose>();

  const fetchSalesSummary = async () => {
    try {
      const summary = await getDailySummary(selectedDate?.toISOString());
      setSalesSummary(summary || { cash: 0, bank: 0, total: 0 });
      const efectivoInicial = parseFloat(lastClosingBalance.efectivo_real) || 0;
      const efectivoEsperado = efectivoInicial + (summary?.cash || 0);

      form.setFieldsValue({
        efectivo_inicial: efectivoInicial,
        bancario_inicial: 0,
        ventas_efectivo: summary?.cash || 0,
        ventas_qr: summary?.bank || 0,
        efectivo_esperado: efectivoEsperado,
        bancario_esperado: summary?.bank,

      });
    } catch (error) {
      console.error("Error while fetching sales summary", error);
      setSalesSummary({ cash: 0, bank: 0, total: 0 });
    }
  };

  useEffect(() => {
    fetchSalesSummary();
  }, []);

  useEffect(() => {
    const esperado = form.getFieldValue("efectivo_esperado") || 0;
    const real = coinTotals + billTotals;
    form.setFieldValue("efectivo_real", real.toFixed(2));
    form.setFieldValue("diferencia_efectivo", (real - esperado).toFixed(2));
  }, [coinTotals, billTotals]);

  const handleSubmit = async (values: any) => {
    try {
      const dailyEffectiveValues: Record<string, number> = {};

      Object.keys(coinDenominations).forEach((denomination) => {
        dailyEffectiveValues[`corte_${denomination.replace(".", "_")}`] =
            values.coins?.[denomination] || 0;
      });

      Object.keys(billDenominations).forEach((denomination) => {
        dailyEffectiveValues[`corte_${denomination.replace(".", "_")}`] =
            values.bills?.[denomination] || 0;
      });

      dailyEffectiveValues["total_coins"] = coinTotals;
      dailyEffectiveValues["total_bills"] = billTotals;

      const { coins, bills, ...boxCloseValues } = values;
      const resDailyEffective = await registerDailyEffectiveAPI(dailyEffectiveValues);
      const dailyEffectiveID = resDailyEffective.newDailyEffective.id_efectivo_diario;

      const newBoxClose = {
        ...boxCloseValues,
        id_efectivo_diario: dailyEffectiveID,
        ingresos_efectivo: values.ventas_efectivo,
        ventas_efectivo: salesSummary?.cash,
        id_sucursal: localStorage.getItem("sucursalId"),
      };

      const boxCloseRes = await registerBoxCloseAPI(newBoxClose);
      const boxCloseID = boxCloseRes.newBoxClose.id_cierre_caja;

      const dailyEffectiveValuesWithBoxClose = {
        ...dailyEffectiveValues,
        id_cierre_caja: boxCloseID,
      };

      await updateDailyEffectiveAPI(dailyEffectiveID, dailyEffectiveValuesWithBoxClose);

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
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-4">
        <Card>
          <Title level={5}>Información General</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                  label="Responsable"
                  name="responsible"
                  rules={[{ required: true, message: "Campo requerido" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Fecha">
                <Input
                    readOnly
                    value={dayjs().format("DD/MM/YYYY")}
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
              rules={[{ required: true, message: "Campo requerido" }]}
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
  );
};

export default BoxCloseForm;
