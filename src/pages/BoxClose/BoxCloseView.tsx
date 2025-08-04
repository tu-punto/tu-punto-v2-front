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
import dayjs from "dayjs";

const { Title } = Typography;

interface Props {
    boxClose: any; // Puedes reemplazar con IBoxClose si tienes el modelo tipado
}

const BoxCloseView = ({ boxClose }: Props) => {
    const {
        fecha,
        responsible,
        efectivo_inicial,
        ventas_efectivo,
        efectivo_esperado,
        efectivo_real,
        diferencia_efectivo,
        bancario_inicial,
        ventas_qr,
        bancario_esperado,
        bancario_real,
        diferencia_bancario,
        observaciones,
        total_coins,
        total_bills,
        id_efectivo_diario,
    } = boxClose;

    const monedas = (boxClose.efectivo_diario || [])
        .filter(item => item.corte < 10)
        .map((item, index) => ({
            key: index,
            corte: item.corte,
            cantidad: item.cantidad,
            total: item.corte * item.cantidad,
        }));

    const billetes = (boxClose.efectivo_diario || [])
        .filter(item => item.corte >= 10)
        .map((item, index) => ({
            key: index,
            corte: item.corte,
            cantidad: item.cantidad,
            total: item.corte * item.cantidad,
        }));

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

    return (
        <div className="p-4">
            <Card>
                <div className="mb-4">
                    <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                        <img src="/cierre-caja-icon.png" alt="Cierre de Caja" className="w-8 h-8" />
                        <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                            Cierre de Caja Diario
                        </h1>
                    </div>
                </div>

                <Row gutter={16}>
                    {/* COLUMNA IZQUIERDA */}
                    <Col xs={24} md={12}>
                        <Card className="mb-4">
                            <Form layout="vertical">
                                <Form.Item label="Fecha">
                                    <Input value={dayjs(boxClose.created_at).format("DD/MM/YYYY")} readOnly />
                                </Form.Item>
                                <Form.Item label="Responsable del cierre">
                                    <Input value={responsible} readOnly />
                                </Form.Item>
                            </Form>
                        </Card>

                        <Card className="mb-4">
                            <Title level={5}>Resumen de Ventas</Title>
                            <Form layout="vertical">
                                <Form.Item label="Efectivo">
                                    <InputNumber value={ventas_efectivo} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="QR/Bancario">
                                    <InputNumber value={ventas_qr} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Cambios Externos">
                                    <InputNumber
                                        value={boxClose.cambios_externos}
                                        readOnly
                                        style={{ width: "100%" }}
                                        prefix="Bs."
                                    />
                                </Form.Item>

                            </Form>
                        </Card>

                        <Card>
                            <Title level={5}>Recuento de Efectivo</Title>
                            <Form layout="vertical">
                                <Form.Item label="Efectivo inicial en caja">
                                    <InputNumber value={efectivo_inicial} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Ingresos en efectivo">
                                    <InputNumber value={ventas_efectivo} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Efectivo en caja al final del día">
                                    <InputNumber value={efectivo_real} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                            </Form>
                        </Card>
                    </Col>

                    {/* COLUMNA DERECHA */}
                    <Col xs={24} md={12}>
                        <Card className="mb-4">
                            <Form layout="vertical">
                                <Form.Item label="Efectivo esperado">
                                    <InputNumber value={efectivo_esperado} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Efectivo real">
                                    <InputNumber value={efectivo_real} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Diferencia">
                                    <Tooltip title={diferencia_efectivo === 0 ? "Cuadrado" : "Descuadre"}>
                                        <Tag
                                            icon={diferencia_efectivo === 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
                                            color={diferencia_efectivo === 0 ? "success" : diferencia_efectivo > 0 ? "warning" : "error"}
                                            style={{ width: "100%", textAlign: "center", padding: "4px 0" }}
                                        >
                                            Bs. {diferencia_efectivo?.toFixed(2)}
                                        </Tag>
                                    </Tooltip>
                                </Form.Item>
                            </Form>
                        </Card>

                        <Card className="mb-4">
                            <Form layout="vertical">
                                <Form.Item label="Bancario esperado">
                                    <InputNumber value={bancario_esperado} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Bancario real">
                                    <InputNumber value={bancario_real} readOnly style={{ width: "100%" }} prefix="Bs." />
                                </Form.Item>
                                <Form.Item label="Diferencia">
                                    <Tooltip title={diferencia_bancario === 0 ? "Cuadrado" : "Descuadre"}>
                                        <Tag
                                            icon={diferencia_bancario === 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
                                            color={diferencia_bancario === 0 ? "success" : diferencia_bancario > 0 ? "warning" : "error"}
                                            style={{ width: "100%", textAlign: "center", padding: "4px 0" }}
                                        >
                                            Bs. {diferencia_bancario?.toFixed(2)}
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
                                summary={() => (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
                                        <Table.Summary.Cell index={2}><strong>Bs. {total_coins.toFixed(2)}</strong></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                )}
                            />
                        </Card>

                        <Card>
                            <Title level={5}>Billetes</Title>
                            <Table
                                dataSource={billetes}
                                columns={columns}
                                pagination={false}
                                size="small"
                                summary={() => (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
                                        <Table.Summary.Cell index={2}><strong>Bs. {total_bills.toFixed(2)}</strong></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                )}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card className="mt-4">
                    <Title level={5}>Observaciones</Title>
                    <Input.TextArea value={observaciones} readOnly rows={3} />
                </Card>
            </Card>
        </div>
    );
};

export default BoxCloseView;
