import { Button, Col, DatePicker, Form, Input, InputNumber, message, Modal, Radio, Row, Select } from "antd";
import { CommentOutlined, NotificationOutlined } from '@ant-design/icons';
import { useEffect, useState } from "react";
import { registerFinanceFluxAPI } from "../../api/financeFlux";
import { getWorkersAPI } from "../../api/worker";
import { getSellersAPI, registerSellerAPI } from "../../api/seller";

function FinanceFluxFormModal({ visible, onCancel, onSuccess }: any) {
    const [loading, setLoading] = useState(false);
    const [workers, setWorkers] = useState([])
    const [sellers, setSellers] = useState([])
    const [newSeller, setNewSeller] = useState('')
    const [form] = Form.useForm();

    const handleFinish = async (financeFluxData: any) => {
        setLoading(true);
        const response = await registerFinanceFluxAPI(financeFluxData);
        setLoading(false);
        if (response.status) {
            message.success('Gasto o ingreso registrado con éxito');
            onSuccess()
        } else {
            message.error('Error al registrar el gasto o ingreso');
        }
    };
    const createSeller = async () => {
        if (!newSeller) return
        setLoading(true)
        const response = await registerSellerAPI({ vendedor: newSeller })
        setLoading(false)
        if (response.status) {
            message.success('Vendedor creado con éxito')
            fetchSellers()
            setNewSeller('')
        } else {
            message.error('Error al crear Vendedor')
        }
    }
    const fetchWorkers = async () => {
        try {
            const response = await getWorkersAPI();
            setWorkers(response);
        } catch (error) {
            message.error('Error al obtener los trabajadores');
        }
    };
    const fetchSellers = async () => {
        try {
            const response = await getSellersAPI();
            setSellers(response);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    };
    const handleTipoChange = () => {
        form.validateFields(['id_trabajador']); 
    };

    useEffect(() => {
        fetchWorkers();
        fetchSellers();
    }, []);
    return (
        <Modal
            title="Agregar Gasto o Ingreso"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <Form
                name="financeFluxForm"
                onFinish={handleFinish}
                layout="vertical"
                form={form}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='tipo'
                            label='Tipo'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                        >
                            <Radio.Group onChange={handleTipoChange}>
                                <Radio.Button value='Gasto'>Gasto</Radio.Button>
                                <Radio.Button value='Ingreso'>Ingreso</Radio.Button>
                                <Radio.Button value='Inversion'>Inversion</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='categoria'
                            label='Categoria'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                        >
                            <Input prefix={<NotificationOutlined />}></Input>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='id_vendedor'
                            label='Vendedor'
                        >
                            <Select
                                placeholder="Selecciona un vendedor"
                                dropdownRender={menu => (
                                    <>
                                        {menu}
                                        <div style={{ display: 'flex', padding: 8 }}>
                                            <Input
                                                style={{ flex: 'auto' }}
                                                value={newSeller}
                                                onChange={e => setNewSeller(e.target.value)}
                                            />
                                            <Button
                                                type="link"
                                                onClick={createSeller}
                                                loading={loading}
                                            >
                                                Añadir vendedor
                                            </Button>
                                        </div>
                                    </>
                                )}
                                options={sellers.map((seller: any) => ({
                                    value: seller.id_vendedor,
                                    label: seller.nombre + " " + seller.apellido,
                                }))}
                                showSearch
                                filterOption={(input, option: any) =>
                                    option.label.toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='fecha'
                            label='Fecha'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                            <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='concepto'
                            label='Concepto'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                        >
                            <Input prefix={<CommentOutlined />}></Input>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='monto'
                            label='Monto'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            initialValue={0.00}
                        >
                            <InputNumber
                                prefix={"Bs. "}
                                style={{ width: '30%' }}
                            >
                            </InputNumber>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='id_trabajador'
                            label='Trabajador'
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (getFieldValue('tipo') === 'Inversion' && !value) {
                                            return Promise.reject(new Error('Este campo es obligatorio'));
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Select
                                placeholder="Selecciona un Trabajador"
                                options={workers.map((worker: any) => ({
                                    value: worker.id_trabajador,
                                    label: worker.nombre,
                                }))}
                                showSearch
                                filterOption={(input, option: any) =>
                                    option.label.toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Registrar Gasto o ingreso
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    )
}
export default FinanceFluxFormModal;