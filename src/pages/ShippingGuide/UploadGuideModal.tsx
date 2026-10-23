import { Button, Card, Col, DatePicker, Form, Input, message, Modal, Radio, Row, Select, Upload } from "antd";
import { useContext, useEffect, useState } from "react";
import { MessageOutlined, UploadOutlined } from "@ant-design/icons";
import moment from "moment";
import { UserContext } from "../../context/userContext.tsx";
import { registerShippingGuideAPI } from "../../api/shippingGuide.ts";
import { getSellerAPI } from "../../api/seller";
import { IBranch } from "../../models/branchModel.ts";
import { getSucursalsAPI } from "../../api/sucursal.ts";

function UploadGuideModal({ visible, onCancel, onFinish }: any) {
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [branchs, setBranchs] = useState<IBranch[]>();
    const [form] = Form.useForm();
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [guideFiles, setGuideFiles] = useState<any[]>([]);
    const [listFiles, setListFiles] = useState<any[]>([]);
    const [isFleetShipment, setIsFleetShipment] = useState<boolean | undefined>();

    useEffect(() => { if (visible) fetchBranchs(); }, [visible, user?.id_vendedor]);

    const fetchBranchs = async () => {
        const branches = await getSucursalsAPI();
        const sellerData = await getSellerAPI(user.id_vendedor);
        const activeBranchIDs = new Set<string>();
        const sellerFinalDate = new Date(sellerData.fecha_vigencia);
        sellerData.pago_sucursales.forEach((branch: IBranch) => {
            const finalDate = branch.fecha_salida ? new Date(branch.fecha_salida) : sellerFinalDate;
            if (finalDate > new Date()) activeBranchIDs.add(String((branch as any).id_sucursal?._id || branch.id_sucursal || ""));
        });
        setBranchs(branches.filter((branch: IBranch) => activeBranchIDs.has(String(branch._id || ""))));
    };

    const resetModal = () => {
        form.resetFields();
        setSelectedBranch("");
        setGuideFiles([]);
        setListFiles([]);
        setIsFleetShipment(undefined);
    };

    const handleFinish = async (values: any) => {
        const productFiles = listFiles.slice(0, 3).map((file) => file.originFileObj).filter(Boolean);
        const image = isFleetShipment ? guideFiles[0]?.originFileObj : null;
        if (typeof isFleetShipment !== "boolean") return message.error("Indica si los productos se enviarán por flota");
        if (isFleetShipment && !image) return message.error("Debes subir la foto de la guía de envío");
        if (!productFiles.length) return message.error("Debes subir al menos un archivo con la lista de productos");

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("vendedor", user.id_vendedor);
            formData.append("sucursal", selectedBranch);
            formData.append("descripcion", values.description || "");
            formData.append("enviado_por_flota", String(isFleetShipment));
            if (image) formData.append("imagen", image);
            productFiles.forEach((file) => formData.append("lista_productos", file));
            const response = await registerShippingGuideAPI(formData);
            if (!response.success) return message.error(response.message || response.msg || "Error registrando la guía");
            message.success("Guía de envío registrada");
            resetModal();
            onCancel();
            onFinish();
        } catch (error) {
            console.error("Error en Modal Guía de Envío: ", error);
            message.error("Error procesando la guía");
        } finally { setLoading(false); }
    };

    return <Modal title="Lista y/o Guía" open={visible} onCancel={() => { resetModal(); onCancel(); }} width={700} footer={null}>
        <div data-tour-id="shipping-guide-upload-modal">
            <Form form={form} name="uploadGuideForm" onFinish={handleFinish} layout="vertical">
                <Card title="Información Básica" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fecha_subida" label="Fecha de Subida"><DatePicker style={{ width: "100%" }} disabled defaultValue={moment()} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="sucursal" label="Sucursal" rules={[{ required: true }]}><Select placeholder="Seleccione una sucursal" value={selectedBranch} onChange={setSelectedBranch}>{branchs?.map((branch: any) => <Select.Option key={branch._id} value={branch._id}>{branch.nombre}</Select.Option>)}</Select></Form.Item></Col>
                    </Row>
                </Card>
                <Card bordered={false}>
                    <Row gutter={16}><Col span={12}><Form.Item name="enviado_por_flota" label="¿Los productos se enviarán por flota?" rules={[{ required: true, message: "Selecciona una opción" }]}><Radio.Group onChange={(event) => { const value = event.target.value as boolean; setIsFleetShipment(value); if (!value) { setGuideFiles([]); form.setFieldValue("image", []); } }}><Radio value={true}>Sí</Radio><Radio value={false}>No</Radio></Radio.Group></Form.Item></Col></Row>
                    <Row gutter={16}><Col span={12}><Form.Item name="description" label="Descripción"><Input prefix={<MessageOutlined />} /></Form.Item></Col></Row>
                    {isFleetShipment !== undefined && <Row gutter={16}>
                        {isFleetShipment && <Col span={12}><Form.Item name="image" label="Foto de la Guía de Envío (obligatoria)" valuePropName="fileList" getValueFromEvent={(event) => Array.isArray(event) ? event : event?.fileList} rules={[{ required: true, message: "Adjunta la foto de la guía de envío" }]}><Upload name="image" accept="image/*" beforeUpload={() => false} fileList={guideFiles} maxCount={1} onChange={(info) => { const next = info.fileList.slice(-1); setGuideFiles(next); form.setFieldValue("image", next); }} onRemove={() => { setGuideFiles([]); form.setFieldValue("image", []); }}><Button icon={<UploadOutlined />}>Seleccionar Imagen</Button></Upload></Form.Item></Col>}
                        <Col span={12}><Form.Item name="lista_productos" label="Lista de productos (obligatoria)" valuePropName="fileList" getValueFromEvent={(event) => Array.isArray(event) ? event : event?.fileList} rules={[{ required: true, message: "Adjunta al menos un archivo" }]}><Upload multiple beforeUpload={() => false} accept=".pdf,.xls,.xlsx,.csv,image/*" fileList={listFiles} maxCount={3} onChange={(info) => { const next = info.fileList.slice(0, 3); setListFiles(next); form.setFieldValue("lista_productos", next); }} onRemove={(file) => { const next = listFiles.filter((item) => item.uid !== file.uid); setListFiles(next); form.setFieldValue("lista_productos", next); }}><Button icon={<UploadOutlined />}>Subir lista</Button></Upload></Form.Item></Col>
                    </Row>}
                </Card>
                <Form.Item style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" loading={loading}>Guardar</Button></Form.Item>
            </Form>
        </div>
    </Modal>;
}

export default UploadGuideModal;
