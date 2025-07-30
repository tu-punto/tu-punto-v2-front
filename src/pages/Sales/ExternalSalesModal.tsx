import { Modal, Form, Input, InputNumber, Radio, Col, Row, DatePicker, Card, Button} from 'antd';
import { UserOutlined, PhoneOutlined, HomeOutlined} from '@ant-design/icons';
import { useEffect, useState } from 'react';
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
    const [servicePrice, setServicePrice] = useState(0);
    const [isBigPackage, setIsBigPackage] = useState(false);
    const [isDelivery, setIsDelivery] = useState(false)
    const [isCityShipping, setIsCityShipping]  = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [hasPriceProduct, setHasPriceProduct] = useState(false);
    const [hasShippingService, setHasShippingService] = useState(false);
    const [hasBranchService, setHasBranchService] = useState(false);
    const [packageSizeX, setPackageSizeX] = useState(0);
    const [packageSizeY, setPackageSizeY] = useState(0);
    const [packageSizeZ, setPackageSizeZ] = useState(0);
    const [saleTotalPrice, setSaleTotalPrice] = useState(0);

    const handleFinish = async (values: any) => {

    };

    const handleCancel = () => {
        resetValues();
        onCancel();
    };

    const resetValues = () => {
        setPackageSizeType('pequenio');
        setServicePrice(0);
        setIsBigPackage(false);
        setIsDelivery(false);
        setIsCityShipping(false);
        setIsPaid(false);
        setHasPriceProduct(false);
        setHasShippingService(false);
        setHasBranchService(false);
        setPackageSizeX(0);
        setPackageSizeY(0);
        setPackageSizeZ(0);
        setSaleTotalPrice(0);
        form.resetFields();
    };
    
    useEffect(() => {
        let total = 0;
        if (packageSizeType === 'pequenio') total+=5;
        if (packageSizeType === 'mediano') total+=10;
        if (packageSizeType === 'grande') total+=15;
        if (packageSizeType === 'muy-grande') total+=(packageSizeX*packageSizeY*packageSizeZ*15)/(40*40*40);
        if (isDelivery) console.log("TODO, obtener el precio del delivery")
        if (isCityShipping) total+=12
        if (hasShippingService) console.log("TODO, Obtener precio de la flota")
        if (hasBranchService) total+=12
        if (hasPriceProduct) total+=5

        setSaleTotalPrice(total);
        form.setFieldsValue({
            total_price: total != 0 ? total.toFixed(2) : "0.00"
        })
    },[packageSizeType, packageSizeX, packageSizeY, packageSizeZ, isDelivery, isCityShipping, hasShippingService, hasBranchService, hasPriceProduct])

    return (
        <Modal title="Ventas Externas" open={visible} onCancel={handleCancel} width={800} footer={null}>
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
                <Card title="Servicios del Pedido" bordered={false} style={{marginTop: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="delivery" label='¿Se requiere delivery?' rules={[{required: true}]}>
                                <Radio.Group
                                    onChange={(e) => setIsDelivery(e.target.value === 'si')}
                                >
                                    <Radio.Button value="si">Si</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {isDelivery && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="direccion" label="Dirección">
                                    <Input prefix={<HomeOutlined />} />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="city_shipping" label='¿Se requiere envío a otra ciudad?' rules={[{required: true}]}>
                                <Radio.Group
                                    onChange={(e) => setIsCityShipping(e.target.value === 'si')}
                                >
                                    <Radio.Button value="si">Si</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {isCityShipping && (
                        <div>TODO - ENVIO A OTRA CIUDAD(CIUDAD A LA QUE SE DESEA EL PEDIDO, Y UNA OPCION PARA ESCOGER SI QUIERE RECOGER EN UNA FLOTA [ESPACIO PARA PONER EN CUAL EN ESPECIFICO] O EN UNA DE NUESTRA SUCURSALES[ESPACIO PARA PONER EN CUAL EN ESPECIFICO])</div>
                    )}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="product_treat" label='¿Cómo se debe proceder con el producto?' rules={[{required: true}]}>
                                <Radio.Group
                                    onChange={(e) => {
                                        setHasPriceProduct(e.target.value !== 'no')
                                        /*Hay que hacer más lógica aca
                                        SI SE DEBE COBRAR O PAGAR SE HABILITAN ESTOS ESPACIOS EN LA EDICION:
                                        -SE COBRO? ☐ (SE DEBE AÑADIR EL PRECIO A CIERRE DE CAJA DE ESE DIA)
                                        -SE PAGO AL VENDEDOR? ☐ (SE DEBE RESTAR EL PRECIO A CIERRE DE CAJA DEL DIA)
                                        */ 
                                    }}
                                >
                                    <Radio.Button value="no">No</Radio.Button>
                                    <Radio.Button value="cobrar">Cobrar</Radio.Button>
                                    <Radio.Button value="pagar">Pagar</Radio.Button>
                                    <Radio.Button value="controlar">Controlar su estado</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {hasPriceProduct && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="service_price" label="Monto del servicio"  rules={[{required: hasPriceProduct}]}>
                                    <InputNumber
                                        prefix="Bs."
                                        min={0}
                                        value={servicePrice}
                                        onChange={value => setServicePrice(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                </Card>
                <Card title="Detalles de Pago" bordered={false} style={{marginTop: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="total_price" label="Monto a cobrar">
                                <InputNumber
                                    prefix="Bs."
                                    style={{width: '100%'}}
                                    readOnly
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="product_paid" label='¿Se pagó por el servicio?' rules={[{required: true}]}>
                                <Radio.Group
                                    onChange={(e) => setIsPaid(e.target.value === 'si')}
                                >
                                    <Radio.Button value="si">Si</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Form.Item style={{ marginTop: 16 }}>
                    <Button type="primary" htmlType="submit">
                        Guardar
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default ExternalSalesModal;