import { Modal, Form, Input, InputNumber, Radio, Col, Row, DatePicker, Card, Button, Select, message} from 'antd';
import { UserOutlined, PhoneOutlined, HomeOutlined, CarFilled} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { registerExternalSaleAPI } from '../../api/externalSale';
import { getSucursalsAPI } from "../../api/sucursal";
import moment from "moment-timezone";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dayjs from 'dayjs';
dayjs.extend(utc);
dayjs.extend(timezone);

function ExternalSalesModal({visible, onCancel, onClose}: any) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [packageSizeType, setPackageSizeType] = useState<null|'pequenio'|'mediano'|'grande'|'muy-grande'>();
    const [city, setCity] = useState("");
    const [servicePrice, setServicePrice] = useState(0);
    const [deliveryPrice, setDeliveryPrice] = useState(0);  
    const [shippingPrice, setShippingPrice] = useState(0);
    const [isBigPackage, setIsBigPackage] = useState(false);
    const [isDelivery, setIsDelivery] = useState(false)
    const [isCityShipping, setIsCityShipping]  = useState(false);
    const [isOptionPagar, setIsOptionPagar] = useState(false);
    const [isOptionCobrar, setIsOptionCobrar] = useState(false);
    const [isOptionControlar, setIsOptionControlar] = useState(false);
    const [isOptionPagada, setIsOptionPagada] = useState(false);
    const [isOptionCobrada, setIsOptionCobrada] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [isBranch, setIsBranch] =useState(false);
    const [hasShippingService, setHasShippingService] = useState(false);
    const [packageSizeX, setPackageSizeX] = useState(0);
    const [packageSizeY, setPackageSizeY] = useState(0);
    const [packageSizeZ, setPackageSizeZ] = useState(0);
    const [saleTotalPrice, setSaleTotalPrice] = useState(0);
    const [sucursales, setSucursales] = useState<any[]>([]);

    const handleFinish = async (values: any) => {
        setLoading(true);
        if(saleTotalPrice < 0) {
            message.error("El precio total no puede ser menor a 0.");
            setLoading(false);
            return;
        }

        //TODO realizar operaciones en cierre de caja según los valores de isOptionPagada, isOptionCobrada, isPaid

        try {
            const vendedorNombre = values.nombre_vendedor;
            const vendedorCelular = values.telefono_vendedor || "";
            const compradorNombre = values.nombre_comprador;
            const compradorCelular = values.telefono_comprador || "";
            const fecha = values.fecha_pedido?.format("YYYY-MM-DD") || moment().tz("America/La_Paz").format("YYYY-MM-DD");
            const direccion = values.direccion || "";
            const ciudad = city;
            const sucursal_id = values.sucursalID || "";
            const flota = values.flota || "";
            const montoServicio = values.service_price || 0;
            const montoTotal = saleTotalPrice;

            const response = await registerExternalSaleAPI({
                vendedor: vendedorNombre,
                telefono_vendedor: vendedorCelular,
                comprador: compradorNombre,
                telefono_comprador: compradorCelular,
                fecha_pedido: fecha,
                direccion_delivery: direccion,
                ciudad_envio: ciudad,
                id_sucursal: sucursal_id,
                nombre_flota: flota,
                precio_servicio: montoServicio,
                precio_total: montoTotal
            });

            if (!response.success) {
                message.error("Error registrando la venta");
                setLoading(false);
                return;
            } else {
                message.success("Venta externa registrada");
                resetValues();
                onClose();
            }
        } catch(error) {
            console.error("Error en Modal Venta Externa: ", error);
            message.error("Error procesando la venta");
        }
        setLoading(false);
    };

    const handleCancel = () => {
        resetValues();
        onCancel();
    };

    const resetValues = () => {
        setPackageSizeType(null);
        setCity("");
        setServicePrice(0);
        setDeliveryPrice(0);
        setShippingPrice(0);
        setIsBigPackage(false);
        setIsDelivery(false);
        setIsCityShipping(false);
        setIsOptionPagar(false);
        setIsOptionCobrar(false);
        setIsOptionControlar(false);
        setIsOptionPagada(false);
        setIsOptionCobrada(false);
        setIsPaid(false);
        setIsBranch(false);
        setHasShippingService(false);
        setPackageSizeX(0);
        setPackageSizeY(0);
        setPackageSizeZ(0);
        setSaleTotalPrice(0);
        setLoading(false);
        form.resetFields();
    };

    const ciudades = [
        "La Paz",
        "Cochabamba",
        "Santa Cruz"
    ]
    
    useEffect(() => {
        getSucursalsAPI()
      .then((data) => setSucursales(data))
      .catch(() => console.error("No se pudieron cargar las sucursales"));
    },[isBranch])

    useEffect(() => {
        let total = 0;
        if (packageSizeType === 'pequenio') total+=5;
        else if (packageSizeType === 'mediano') total+=10;
        else if (packageSizeType === 'grande') total+=15;
        else if (packageSizeType === 'muy-grande') total+=(packageSizeX*packageSizeY*packageSizeZ*15)/(40*40*40);
        if (isDelivery) total+=deliveryPrice;
        if (isCityShipping) total+=12;
        if (hasShippingService) total+=shippingPrice;
        if (isBranch) total+=12;
        if (isOptionPagar || isOptionCobrar || isOptionControlar) total+=5;

        setSaleTotalPrice(total);
        form.setFieldsValue({
            total_price: total != 0 ? total.toFixed(2) : "0.00"
        })
    },[packageSizeType, packageSizeX, packageSizeY, packageSizeZ, deliveryPrice, shippingPrice, isDelivery, isCityShipping, 
        hasShippingService, isBranch, isOptionPagar, isOptionCobrar, isOptionControlar])

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
                            <Col span={12}>
                                <Form.Item name="delivery_price" label="Precio"  rules={[{required: isDelivery}]}>
                                    <InputNumber
                                        prefix="Bs."
                                        min={0}
                                        value={deliveryPrice}
                                        onChange={value => setDeliveryPrice(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
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
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="city" label='¿A qué ciudad se realiza el envío?' rules={[{required:isCityShipping}]}>
                                    <Radio.Group
                                        onChange={(e) => setCity(e.target.value)}
                                    >
                                        {ciudades.map((ciudad) => (
                                            <Radio.Button value={ciudad} key={ciudad}>{ciudad}</Radio.Button>
                                        ))}
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    {isCityShipping && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="sucursal-o-flota" label='¿Dónde se recogerá el producto?' rules={[{required:isCityShipping}]}>
                                    <Radio.Group
                                        onChange={(e) => {
                                            setIsBranch(e.target.value === "sucursal");
                                            setHasShippingService(e.target.value === "flota")
                                        }}
                                    >
                                        <Radio.Button value="sucursal">Sucursal</Radio.Button>
                                        <Radio.Button value="flota">Flota</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            {isBranch && (
                                <Col span={12}>
                                    <Form.Item name="sucursalID" label='¿Qué sucursal se utilizará?' rules={[{required: isBranch, message: "Seleccione una sucursal"}]}>
                                        <Select placeholder="Sucursal">
                                            {sucursales.map((b) => (
                                            <Select.Option key={b._id} value={b._id}>
                                                {b.nombre}
                                            </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            )}
                            {hasShippingService && (
                                <Col span={12}>
                                    <Form.Item name="flota" label='¿Qué flota se utilizará?' rules={[{required: !isBranch}]}>
                                        <Input prefix={<CarFilled />} />
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                    )}
                    {hasShippingService && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="ship_price" label="Precio de la flota"  rules={[{required: hasShippingService}]}>
                                    <InputNumber
                                        prefix="Bs."
                                        min={0}
                                        value={shippingPrice}
                                        onChange={value => setShippingPrice(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="product_operation" label='¿Se debe realizar alguna operación adicional sobre el pedido?' rules={[{required: true}]}>
                                <Radio.Group
                                    onChange={(e) => {
                                        setIsOptionPagar(e.target.value === "pagar");
                                        setIsOptionCobrar(e.target.value === "cobrar");
                                        setIsOptionControlar(e.target.value === "controlar");
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
                    {(isOptionPagar || isOptionCobrar || isOptionControlar) && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="service_price" label="Precio"  rules={[{required: isOptionPagar || isOptionCobrar || isOptionControlar}]}>
                                    <InputNumber
                                        prefix="Bs."
                                        min={0}
                                        value={servicePrice}
                                        onChange={value => setServicePrice(value ?? 0)}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            {isOptionPagar && ( 
                                <Col span={12}>
                                    <Form.Item name="price_pagar" label='¿Se pagó al vendedor?'>
                                        <Radio.Group
                                            onChange={(e) => setIsOptionPagada(e.target.value === 'si')}
                                        >
                                            <Radio.Button value="si">Si</Radio.Button>
                                            <Radio.Button value="no">No</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            )}
                            {isOptionCobrar && ( 
                                <Col span={12}>
                                    <Form.Item name="price_cobrar" label='¿Se cobró?'>
                                        <Radio.Group
                                            onChange={(e) => setIsOptionCobrada(e.target.value === 'si')}
                                        >
                                            <Radio.Button value="si">Si</Radio.Button>
                                            <Radio.Button value="no">No</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            )}
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
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Guardar
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default ExternalSalesModal;