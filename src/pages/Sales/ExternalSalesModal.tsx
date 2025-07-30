import { Modal, Form, Input, InputNumber, Radio, Col, Row, DatePicker, Card} from 'antd';
import { UserOutlined, PhoneOutlined} from '@ant-design/icons';
import { useState } from 'react';
import { registerShippingAPI, updateShippingAPI } from '../../api/shipping';
import { updateSubvariantStockAPI } from '../../api/product';
import { useWatch } from 'antd/es/form/Form';
import { getSucursalsAPI } from "../../api/sucursal";
import moment from "moment-timezone";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dayjs from 'dayjs';
dayjs.extend(utc);
dayjs.extend(timezone);

function ExternalSalesModal({
    visible, onCancel, onSuccess, selectedProducts,
    totalAmount, handleSales, sucursals,
    clearSelectedProducts, isAdmin, sellers, suc
}: any) {
    const [form] = Form.useForm();
    const [packageSizeType, setPackageSizeType] = useState<'pequenio'|'mediano'|'grande'|'muy-grande'>();
    const [isBigPackage, setIsBigPackage] = useState(true);
    const [packageSizeX, setPackageSizeX] = useState(0);
    const [packageSizeY, setPackageSizeY] = useState(0);
    const [packageSizeZ, setPackageSizeZ] = useState(0);

    const handleFinish = async (values: any) => {

    }
    console.log(packageSizeX, packageSizeY, packageSizeZ)

    return (
        <Modal title="Ventas Externas" open={visible} onCancel={onCancel} width={800}>
            <Form form={form} name='externalSaleForm' onFinish={handleFinish} layout='vertical'>
                <Card title="Información del Vendedor" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='nombre_vendedor' label='Nombre' rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name='telefono_vendedor' label='Celular'>
                                <Input
                                    prefix={<PhoneOutlined />}
                                    onKeyDown={(e) => {
                                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                <Card title="Información del Comprador" bordered={false} style={{marginTop: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='nombre_comprador' label='Nombre' rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name='telefono_comprador' label='Celular'>
                                <Input
                                    prefix={<PhoneOutlined />}
                                    onKeyDown={(e) => {
                                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                <Card title="Datos del Pedido" bordered={false} style={{marginTop: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='fecha_pedido' label='Fecha del pedido'>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="tamanio_paquete" label="¿De qué tamaño es el paquete?" rules={[{ required: true }]}>
                                <Radio.Group
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPackageSizeType(value);
                                        setIsBigPackage(value === 'muy-grande')
                                    }}
                                >
                                    <Radio.Button value="pequenio">Pequeño - 5Bs</Radio.Button>
                                    <Radio.Button value="mediano">Mediano - 10Bs</Radio.Button>
                                    <Radio.Button value="grande">Grande - 15Bs</Radio.Button>
                                    <Radio.Button value="muy-grande">Muy Grande</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {isBigPackage && (
                        <Form.Item name="package_size" label="Tamaño del paquete" rules={[{required: isBigPackage}]}>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <InputNumber
                                        prefix="X: "
                                        suffix=" [cm]"
                                        min={0}
                                        value={packageSizeX}
                                        onChange={value => setPackageSizeX(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <InputNumber
                                        prefix="Y: "
                                        suffix=" [cm]"
                                        min={0}
                                        value={packageSizeY}
                                        onChange={value => setPackageSizeY(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <InputNumber
                                        prefix="Z: "
                                        suffix=" [cm]"
                                        min={0}
                                        value={packageSizeZ}
                                        onChange={value => setPackageSizeZ(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                            </Row>
                        </Form.Item>
                    )}
                </Card>
            </Form>
        </Modal>
    );
}

export default ExternalSalesModal;