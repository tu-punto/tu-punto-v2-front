import { useEffect, useState } from "react";
import { Form, Input, message } from "antd";
import { EditOutlined, EnvironmentOutlined, HomeOutlined, PhoneOutlined } from "@ant-design/icons";
import { registerSucursalAPI, updateSucursalAPI, uploadSucursalHeaderImageAPI, } from "../../api/sucursal";
import FormModal from "../../components/FormModal";
import { IBranch } from "../../models/branchModel";

type BranchFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  branch: IBranch | null;
}

const BranchFormModal = ({ visible, onClose, onSubmit, branch }: BranchFormModalProps) => {
  const [form] = Form.useForm();
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const updateLocalBranchHeader = (branchId: string, branchName: string, headerUrl?: string) => {
    const activeSucursalId = localStorage.getItem("sucursalId");
    if (!activeSucursalId || String(activeSucursalId) !== String(branchId)) return;

    localStorage.setItem("sucursalNombre", branchName || "Sin sucursal");
    if (typeof headerUrl === "string") {
      localStorage.setItem("sucursalImagenHeader", headerUrl);
    }
    window.dispatchEvent(new Event("branch-header-updated"));
  };

  const uploadHeaderIfNeeded = async (branchId: string) => {
    if (!headerFile) return undefined;

    const uploadRes = await uploadSucursalHeaderImageAPI(branchId, headerFile);
    if (!uploadRes?.status && !uploadRes?.success) {
      throw new Error(uploadRes?.msg || "No se pudo subir la imagen");
    }

    return uploadRes?.imageUrl || uploadRes?.updatedSucursal?.imagen_header || "";
  };

  const handleEdit = async (values: IBranch) => {
    if (!branch || !branch._id) {
      message.error("Error al actualizar la informacion");
      return;
    }

    try {
      setSaving(true);
      message.loading({ content: "Actualizando...", key: "branch-save" });

      const updateRes = await updateSucursalAPI(branch._id, values);
      if (!updateRes?.status && !updateRes?.success) {
        throw new Error(updateRes?.msg || "No se pudo actualizar la sucursal");
      }

      const uploadedHeader = await uploadHeaderIfNeeded(branch._id);
      updateLocalBranchHeader(branch._id, values.nombre, uploadedHeader);

      message.success({
        content: headerFile ? "Sucursal e imagen actualizadas" : "Sucursal actualizada correctamente",
        key: "branch-save",
      });
      form.resetFields();
      onSubmit();
    } catch (error) {
      message.error({ content: "Error al actualizar la informacion", key: "branch-save" });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (values: IBranch) => {
    try {
      setSaving(true);
      message.loading({ content: "Creando sucursal...", key: "branch-save" });

      const createRes = await registerSucursalAPI(values);
      if (!createRes?.status && !createRes?.success) {
        throw new Error(createRes?.msg || "No se pudo crear la sucursal");
      }

      const newBranchId = createRes?.newSucursal?._id;
      if (headerFile && newBranchId) {
        await uploadHeaderIfNeeded(newBranchId);
      }

      message.success({
        content: headerFile ? "Sucursal creada y header subido a AWS" : "Sucursal creada con exito",
        key: "branch-save",
      });
      form.resetFields();
      onSubmit();
    } catch (error) {
      message.error({ content: "Error al crear la sucursal", key: "branch-save" });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const beforeUploadHeader = (file: File) => {
    setHeaderFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
    return false;
  };

  useEffect(() => {
    if (!visible) return;

    if (branch) {
      form.setFieldsValue(branch);
      setPreviewUrl(branch.imagen_header || "");
    } else {
      form.resetFields();
      setPreviewUrl("");
    }
    setHeaderFile(null);
  }, [visible, branch, form]);

  return (
    <FormModal
      title={branch ? "Editar Sucursal" : "Agregar Sucursal"}
      open={visible}
      onClose={onClose}
      submitTitle={branch ? "Actualizar" : "Agregar"}
      onFinish={branch ? handleEdit : handleCreate}
      form={form}
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
          prefix={<PhoneOutlined />}
        />
      </Form.Item>
    </FormModal>
  );
};

export default BranchFormModal;
