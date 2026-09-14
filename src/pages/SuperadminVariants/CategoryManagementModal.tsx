import { EditOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Form, Image, Input, List, Modal, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { getCategoriesAPI, updateCategoryAPI } from "../../api/category";

type Category = { _id: string; categoria: string; imagen_catalogo_url?: string };

export default function CategoryManagementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const result = await getCategoriesAPI();
    setCategories(Array.isArray(result) ? result : []);
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const closeEditor = () => { setEditing(null); setFile(null); form.resetFields(); };
  const save = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    const payload = new FormData();
    payload.append("categoria", values.categoria.trim());
    if (file) payload.append("imagen", file);
    setSaving(true);
    try {
      const result = await updateCategoryAPI(editing._id, payload);
      if (!result?.status) throw new Error(result?.msg || "No se pudo actualizar la categoria");
      message.success("Categoria actualizada");
      closeEditor();
      await load();
    } catch (error: any) { message.error(error?.message || "No se pudo actualizar la categoria"); }
    finally { setSaving(false); }
  };

  return <>
    <Modal open={open} title="Administrar categorias" onCancel={onClose} footer={<Button onClick={onClose}>Cerrar</Button>} width={720}>
      <List dataSource={categories} locale={{ emptyText: "No hay categorias" }} renderItem={(category) => (
        <List.Item actions={[<Button key="edit" icon={<EditOutlined />} onClick={() => { setEditing(category); form.setFieldsValue({ categoria: category.categoria }); }}>Editar</Button>]}>
          <List.Item.Meta
            avatar={category.imagen_catalogo_url ? <Image width={52} height={52} preview={false} style={{ objectFit: "cover", borderRadius: 8 }} src={category.imagen_catalogo_url} /> : <div style={{ width: 52, height: 52, borderRadius: 8, background: "#f1f5f9" }} />}
            title={category.categoria}
            description={category.imagen_catalogo_url ? "Imagen configurada" : "Usa el icono de respaldo"}
          />
        </List.Item>
      )} />
    </Modal>
    <Modal open={!!editing} title="Editar categoria" onCancel={closeEditor} onOk={() => void save()} confirmLoading={saving} okText="Guardar" cancelText="Cancelar">
      <Form form={form} layout="vertical"><Form.Item name="categoria" label="Nombre" rules={[{ required: true, whitespace: true, message: "Ingresa el nombre" }]}><Input /></Form.Item>
        <Form.Item label="Imagen para el catalogo"><Upload accept="image/jpeg,image/png,image/webp" maxCount={1} beforeUpload={(nextFile) => { setFile(nextFile); return false; }} onRemove={() => setFile(null)}><Button icon={<UploadOutlined />}>Seleccionar imagen</Button></Upload></Form.Item>
      </Form>
    </Modal>
  </>;
}
