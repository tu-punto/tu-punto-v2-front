import { Form, Modal, Input, Button, message } from "antd";
import React, { useEffect } from "react";
import { IBranch } from "../../models/branchModel";
import { registerSucursalAPI, updateSucursalAPI } from "../../api/sucursal";

const BranchFormModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  branch: IBranch | null;
}> = ({ visible, onClose, onSubmit, branch }) => {
  const [form] = Form.useForm();

  const handleEdit = async (values: IBranch) => {
    if (!branch || !branch.id_sucursal) {
      message.error("Error al actualizar la información");
      return;
    }
    try {
      message.loading("Actualizando...");
      await updateSucursalAPI(branch.id_sucursal, values);
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
          <Input />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="direccion"
          label="Dirección"
          rules={[
            { required: true, message: "Por favor ingrese la dirección!" },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="ciudad"
          label="Ciudad"
          rules={[{ required: true, message: "Por favor ingrese la ciudad!" }]}
        >
          <Input />
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
          <Input className="w-full" type="tel" maxLength={13} />

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
