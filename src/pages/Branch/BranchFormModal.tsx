import { useEffect } from "react";
import { Form, Modal, Input, Button, message } from "antd";
import { EditOutlined, EnvironmentOutlined, HomeOutlined, PhoneOutlined } from "@ant-design/icons";
import { registerSucursalAPI, updateSucursalAPI } from "../../api/sucursal";
import { IBranch } from "../../models/branchModel";

type BranchFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  branch: IBranch | null;
}

const BranchFormModal = ({ visible, onClose, onSubmit, branch }: BranchFormModalProps) => {
  const [form] = Form.useForm();

  const handleEdit = async (values: IBranch) => {
    if (!branch || !branch._id) {
      message.error("Error al actualizar la información");
      return;
    }
    try {
      message.loading("Actualizando...");
      await updateSucursalAPI(branch._id, values);
    } catch (error) {
      message.error("Error al actualizar la información");
      console.error(error);
    }
    message.success("Sucursal actualizada correctamente");
    form.resetFields();
    onSubmit();
  };

  const handleCreate = async (values: IBranch) => {
    try {
      message.loading("Creando sucursal...");
      await registerSucursalAPI(values);
    } catch (error) {
      message.error("Error al crear la sucursal");
      console.error(error);
    }
    message.success("Sucursal creada con éxito");
    form.resetFields();
    onSubmit();
  };

  useEffect(() => {
    if (branch) {
      form.setFieldsValue(branch);
    } else {
      form.resetFields();
    }
  }, [branch, form]);

  return (
    <Modal
      title={branch ? "Editar Sucursal" : "Agregar Sucursal"}
      open={visible}
      onCancel={onClose}
      footer={null}
    >
      <Form
        layout="vertical"
        form={form}
        onFinish={branch ? handleEdit : handleCreate}
      >
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="nombre"
          label="Nombre"
          rules={[{ required: true, message: "Por favor ingrese el nombre!" }]}
        >
          <Input
            prefix={<EditOutlined />}
          />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="direccion"
          label="Dirección"
          rules={[
            { required: true, message: "Por favor ingrese la dirección!" },
          ]}
        >
          <Input
            prefix={<HomeOutlined />}
          />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="ciudad"
          label="Ciudad"
          rules={[{ required: true, message: "Por favor ingrese la ciudad!" }]}
        >
          <Input
            prefix={<EnvironmentOutlined />}
           />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="telefono"
          label="Teléfono"
          rules={[
            { required: true, message: "Por favor ingrese el teléfono!" },
            { pattern: /^[0-9]+$/, message: "Solo se permiten números" },
          ]}
        >
          <Input 
            className="w-full" 
            type="tel" 
            maxLength={13}
            prefix={<PhoneOutlined/>}
          />

        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {branch ? "Actualizar" : "Agregar"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchFormModal;
