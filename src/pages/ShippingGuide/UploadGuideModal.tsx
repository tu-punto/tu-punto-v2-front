import { Card, Col, Form, Modal, Row, Input, Upload, Button, message, DatePicker, Select } from "antd";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { MessageOutlined, UploadOutlined } from '@ant-design/icons';
import { registerShippingGuideAPI } from "../../api/shippingGuide.ts";
import { getSellerAPI } from "../../api/seller";
import moment from 'moment';
import { IBranch } from "../../models/branchModel.ts";
import { getSucursalsAPI } from "../../api/sucursal.ts";

function UploadGuideModal({ visible, onCancel, onFinish }: any) {
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [branchs, setBranchs] = useState<IBranch[]>();
    const [form] = Form.useForm();
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBranchs();
    })

    const fetchBranchs = async () => {
        const branches = await getSucursalsAPI();
        const sellerData = await getSellerAPI(user.id_vendedor);
        const branchData = sellerData.pago_sucursales;
        
        const activeBranchIDs: Set<number> = new Set();
        const sellerFinalDate = new Date(sellerData.fecha_vigencia);
        branchData.forEach((branch: IBranch) => {
            if (isActiveSellerBranch(branch, sellerFinalDate)) {
                activeBranchIDs.add(branch.id_sucursal);
            }
        });

        const filteredBranches: IBranch[] = [];
        branches.forEach((branch: IBranch) => {
            if (activeBranchIDs.has(branch._id)) {
                filteredBranches.push(branch);
            }
        })
        setBranchs(filteredBranches)
    }

    const isActiveSellerBranch = (branch: any, finalDate: Date) => {
        const actualDate = new Date();
        let branchFinalDate: Date;
        if (branch.fecha_salida) {
            branchFinalDate = new Date(branch.fecha_salida);
        } else {
            branchFinalDate = finalDate;
        }
        return branchFinalDate > actualDate
    }

    const handleUploadChange = (info: any) => {
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
    };

    const handleFinish = async (values: any) => {
        setLoading(true);
        try {
            const sucursal = selectedBranch;
            const vendedor_id = user.id_vendedor;
            const descripcion = values.description;
            const imagen = values.image && values.image[0] ? values.image[0].originFileObj : null;

            const formData = new FormData();
            formData.append('vendedor', vendedor_id);
            formData.append('sucursal', sucursal);
            formData.append('descripcion', descripcion);
            if (imagen) {
                formData.append('imagen', imagen);
            }

            const response = await registerShippingGuideAPI(formData);

            if (!response.success) {
                message.error("Error registrando la guia");
                setLoading(false);
                return;
            } else {
                message.success("Guia de envío registrada");
                onCancel();
            }
        } catch (error) {
            console.error("Error en Modal Guía de Envío: ", error);
            message.error("Error procesando la guía");
        }
        setLoading(false);
        form.resetFields();
        onFinish();
    };


    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal title="Guía de Envío" open={visible} onCancel={handleCancel} width={700} footer={null}>
            <Form form={form} name="uploadGuideForm" onFinish={handleFinish} layout='vertical'>
                <Card title="Información Básica" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='fecha_subida' label='Fecha de Subida'>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    disabled={true}
                                    defaultValue={moment()}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name='sucursal' label='Sucursal' rules={[{ required: true }]}>
                                <Select
                                    placeholder="Seleccione una sucursal"
                                    value={selectedBranch}
                                    onChange={(value) => setSelectedBranch(value)}
                                >
                                    {branchs?.map((b: any) => (
                                        <Select.Option key={b._id} value={b._id}>
                                            {b.nombre}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                <Card title="Datos Opcionales" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='description' label='Descripción' rules={[{ required: false }]}>
                                <Input
                                    prefix={<MessageOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='image' label='Foto de la Guía' valuePropName="fileList" getValueFromEvent={e => Array.isArray(e) ? e : e && e.fileList} rules={[{ required: false }]}>
                                <Upload
                                    name="image"
                                    accept="image/*"
                                    beforeUpload={() => false}
                                    onChange={handleUploadChange}
                                >
                                    <Button icon={<UploadOutlined />}>Seleccionar Imagen</Button>
                                </Upload>
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

export default UploadGuideModal;
