import {
  Table,
  Card,
  Form,
  Input,
  Row,
  Col,
  Typography,
  InputNumber,
  Tag,
  Tooltip,
} from "antd";
import { CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";

const { Title } = Typography;

const CierreCajaPage = () => {
  const monedas = [
    { key: 1, corte: "0.1", cantidad: 0, total: 0 },
    { key: 2, corte: "0.2", cantidad: 0, total: 0 },
    { key: 3, corte: "0.5", cantidad: 2, total: 1 },
    { key: 4, corte: "1", cantidad: 2, total: 2 },
    { key: 5, corte: "2", cantidad: 6, total: 12 },
    { key: 6, corte: "5", cantidad: 6, total: 30 },
  ];

  const billetes = [
    { key: 1, corte: "10", cantidad: 1, total: 10 },
    { key: 2, corte: "20", cantidad: 7, total: 140 },
    { key: 3, corte: "50", cantidad: 45, total: 2250 },
    { key: 4, corte: "100", cantidad: 24, total: 2400 },
    { key: 5, corte: "200", cantidad: 1, total: 200 },
  ];

  const columns = [
    {
      title: "Corte",
      dataIndex: "corte",
      key: "corte",
      render: (value: any) => `Bs. ${value}`,
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (value: any) => `Bs. ${value.toFixed(2)}`,
    },
  ];

  const diferencia = -90;

  return (
    <div className="p-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold">Cierre de Caja Diario</h1>
        </div>

        <Row gutter={16}>
          {/* Primera columna */}
          <Col xs={24} md={12}>
            <Card className="mb-4">
              <Form layout="vertical">
                <Form.Item label="Fecha">
                  <Input value="4/11/2024" readOnly />
                </Form.Item>
                <Form.Item label="Responsable del cierre">
                  <Input value="Sebastián Palma" readOnly />
                </Form.Item>
              </Form>
            </Card>

            <Card className="mb-4">
              <Title level={5}>Resumen de Ventas</Title>
              <Form layout="vertical">
                <Form.Item label="Efectivo">
                  <InputNumber
                    value={3804}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="QR/Bancario">
                  <InputNumber
                    value={1636}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
              </Form>
            </Card>

            <Card>
              <Title level={5}>Recuento de Efectivo</Title>
              <Form layout="vertical">
                <Form.Item label="Efectivo inicial en caja">
                  <InputNumber
                    value={2625}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="Ingresos en efectivo">
                  <InputNumber
                    value={2498}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="Efectivo en caja al final del día">
                  <InputNumber
                    value={5033}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Segunda columna */}
          <Col xs={24} md={12}>
            <Card className="mb-4">
              <Form layout="vertical">
                <Form.Item label="Efectivo esperado">
                  <InputNumber
                    prefix={"Bs."}
                    value={5123}
                    readOnly
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item label="Efectivo real">
                  <InputNumber
                    value={5033}
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="Diferencia">
                  <Tooltip title={diferencia === 0 ? "Cuadrado" : "Descuadre"}>
                    <Tag
                      icon={
                        diferencia === 0 ? (
                          <CheckCircleOutlined />
                        ) : (
                          <WarningOutlined />
                        )
                      }
                      color={
                        diferencia === 0
                          ? "success"
                          : diferencia > 0
                          ? "warning"
                          : "error"
                      }
                      style={{
                        width: "100%",
                        textAlign: "center",
                        padding: "4px 0",
                      }}
                    >
                      Bs. {diferencia.toFixed(2)}
                    </Tag>
                  </Tooltip>
                </Form.Item>
              </Form>
            </Card>

            <Card className="mb-4">
              <Form layout="vertical">
                <Form.Item label="Bancario esperado">
                  <InputNumber
                    value={5123}
                    readOnly
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="Bancario real">
                  <InputNumber
                    value={5033}
                    style={{ width: "100%" }}
                    prefix={"Bs."}
                  />
                </Form.Item>
                <Form.Item label="Diferencia">
                  <Tooltip title={diferencia === 0 ? "Cuadrado" : "Descuadre"}>
                    <Tag
                      icon={
                        diferencia === 0 ? (
                          <CheckCircleOutlined />
                        ) : (
                          <WarningOutlined />
                        )
                      }
                      color={
                        diferencia === 0
                          ? "success"
                          : diferencia > 0
                          ? "warning"
                          : "error"
                      }
                      style={{
                        width: "100%",
                        textAlign: "center",
                        padding: "4px 0",
                      }}
                    >
                      Bs. {diferencia.toFixed(2)}
                    </Tag>
                  </Tooltip>
                </Form.Item>
              </Form>
            </Card>

            <Card className="mb-4">
              <Title level={5}>Monedas</Title>
              <Table
                dataSource={monedas}
                columns={columns}
                pagination={false}
                size="small"
                summary={(pageData) => {
                  const totalMonedas = pageData.reduce(
                    (sum, row) => sum + row.total,
                    0
                  );
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong>Bs. {totalMonedas.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>

            <Card>
              <Title level={5}>Billetes</Title>
              <Table
                dataSource={billetes}
                columns={columns}
                pagination={false}
                size="small"
                summary={(pageData) => {
                  const totalBilletes = pageData.reduce(
                    (sum, row) => sum + row.total,
                    0
                  );
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong>Bs. {totalBilletes.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default CierreCajaPage;
