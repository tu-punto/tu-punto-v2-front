import { useState, useEffect } from "react";
import { Button, DatePicker, Form, Input, message, Select, Upload } from "antd";
import { MessageOutlined, UploadOutlined } from '@ant-design/icons';
import moment from 'moment';
import { registerShippingGuideAPI } from "../../api/shippingGuide";
import FormModal from "../../components/FormModal";
import useBranches from "../../hooks/useBranches";
import { useUserRole } from "../../hooks/useUserRole";

interface UploadGuideFormProps {
    visible: boolean,
    onCancel: () => void,
    onFinish: () => void,
}

function UploadGuideForm({ visible, onCancel, onFinish }: UploadGuideFormProps) {
    const [loading, setLoading] = useState(false)
    const [selectedBranch, setSelectedBranch] = useState<string>()
    const { user } = useUserRole()
    const { activeBranches, fetchBranches } = useBranches()

    const [form] = Form.useForm()

    useEffect(() => {
        fetchBranches()
    }, [visible])

    const handleFinish = async (values: any) => {
        try {
            setLoading(true)
            const imagen = values.image && values.image[0] ? values.image[0].originFileObj : null;
            const formData = new FormData();
            formData.append('vendedor', user.id_vendedor);
            formData.append('sucursal', values.sucursal)
            formData.append('descripcion', values.descripcion);
            if (imagen) {
                formData.append('imagen', imagen);
            }

            const response = await registerShippingGuideAPI(formData);
            if (!response.success) {
                message.error("Error registrando la guia");
                return;
            } else {
                message.success("Guia de envío registrada");
                onCancel();
            }
        } catch (error) {
            console.error("Error en Modal Guía de Envío: ", error);
            message.error("Error procesando la guía");
        } finally {
            setLoading(false)
            form.resetFields()
            onFinish()
        }
    }

    const handleCancel = () => {
        form.resetFields()
        onCancel()
    }

    return (
        <FormModal
            title="Subir Guía de Envío"
            open={visible}
            onClose={handleCancel}
            onFinish={handleFinish}
            form={form}
            submitLoading={loading}
            width={700}
        >
            <Form.Item
                name='fecha_subida'
                label='Fecha de Subida'
            >
                <DatePicker
                    style={{ width: '100%' }}
                    disabled={true}
                    defaultValue={moment()}
                />
            </Form.Item>
            <Form.Item
                name='sucursal'
                label='Sucursal'
                rules={[{ required: true }]}
            >
                <Select
                    placeholder="Seleccione una sucursal"
                    value={selectedBranch}
                    onChange={(value) => setSelectedBranch(value)}
                >
                    {activeBranches?.map((b: any) => (
                        <Select.Option key={b._id} value={b._id}>
                            {b.nombre}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item name='description' label='Descripción' rules={[{ required: false }]}>
                <Input
                    prefix={<MessageOutlined />}
                />
            </Form.Item>
            <Form.Item name='image' label='Foto de la Guía' valuePropName="fileList" getValueFromEvent={e => Array.isArray(e) ? e : e && e.fileList} rules={[{ required: false }]}>
                <Upload
                    name="image"
                    accept="image/*"
                    beforeUpload={() => false}
                >
                    <Button icon={<UploadOutlined />}>Seleccionar Imagen</Button>
                </Upload>
            </Form.Item>
        </FormModal>
    );
}

export default UploadGuideForm;