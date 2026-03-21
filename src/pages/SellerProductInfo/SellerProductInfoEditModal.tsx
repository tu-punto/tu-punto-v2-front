import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Image,
  Input,
  Modal,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";

import { updateSellerProductInfoByVariantAPI } from "../../api/product";

type SellerProductInfoRow = {
  productId: string;
  variantKey: string;
  displayName: string;
  descripcion?: string | null;
  uso?: string | null;
  imagenes?: { url: string; key?: string }[];
  promocionTitulo?: string | null;
  promocionDescripcion?: string | null;
  promocionFechaInicio?: string | null;
  promocionFechaFin?: string | null;
};

type Props = {
  visible: boolean;
  record: SellerProductInfoRow | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

const toDayjs = (value?: string | null) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const SellerProductInfoEditModal = ({ visible, record, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [clearImages, setClearImages] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!visible || !record) return;

    form.setFieldsValue({
      descripcion: record.descripcion || "",
      uso: record.uso || "",
      promocionTitulo: record.promocionTitulo || "",
      promocionDescripcion: record.promocionDescripcion || "",
      promocionFechaInicio: toDayjs(record.promocionFechaInicio),
      promocionFechaFin: toDayjs(record.promocionFechaFin),
    });
    setClearImages(false);
    setFileList([]);
  }, [visible, record, form]);

  const existingImages = useMemo(() => {
    if (!record?.imagenes || clearImages || fileList.length > 0) return [];
    return record.imagenes.filter((image) => image?.url);
  }, [record, clearImages, fileList]);

  const beforeUpload = (file: RcFile) => {
    setFileList((current) => {
      const nextFile: UploadFile = {
        uid: file.uid,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "done",
        originFileObj: file,
      };
      const next = [...current, nextFile];
      return next.slice(0, 4);
    });
    setClearImages(false);
    return false;
  };

  const handleRemoveFile = (file: UploadFile) => {
    setFileList((current) => current.filter((item) => item.uid !== file.uid));
  };

  const handleSubmit = async () => {
    if (!record) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        productId: record.productId,
        variantKey: record.variantKey,
        descripcion: values.descripcion || "",
        uso: values.uso || "",
        promocion: {
          titulo: values.promocionTitulo || undefined,
          descripcion: values.promocionDescripcion || undefined,
          fechaInicio: values.promocionFechaInicio ? values.promocionFechaInicio.toISOString() : null,
          fechaFin: values.promocionFechaFin ? values.promocionFechaFin.toISOString() : null,
        },
        clearImages: clearImages && fileList.length === 0,
        imageFiles: fileList
          .map((file) => file.originFileObj)
          .filter((file): file is File => Boolean(file)),
      };

      const response = await updateSellerProductInfoByVariantAPI(payload);
      if (!response?.success) {
        message.error(response?.message || "No se pudo actualizar la variante.");
        return;
      }

      message.success("Informacion de la variante actualizada correctamente.");
      await onSuccess();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Error actualizando informacion de variante:", error);
      message.error(error?.message || "Ocurrio un error al actualizar la variante.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      width={860}
      okText="Guardar cambios"
      cancelText="Cancelar"
      title={record ? `Editar variante: ${record.displayName}` : "Editar variante"}
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Form.Item
            name="descripcion"
            label="Descripcion"
            rules={[{ max: 500, message: "La descripcion no puede exceder 500 caracteres" }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount placeholder="Describe la variante..." />
          </Form.Item>

          <Form.Item
            name="uso"
            label="Uso"
            rules={[{ max: 500, message: "El uso no puede exceder 500 caracteres" }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount placeholder="Indica el uso recomendado..." />
          </Form.Item>
        </div>

        <Typography.Title level={5} style={{ marginTop: 8 }}>
          Promocion
        </Typography.Title>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Form.Item
            name="promocionTitulo"
            label="Titulo"
            rules={[{ max: 60, message: "El titulo no puede exceder 60 caracteres" }]}
          >
            <Input maxLength={60} showCount placeholder="Titulo de la promocion" />
          </Form.Item>

          <Form.Item
            name="promocionDescripcion"
            label="Descripcion"
            rules={[{ max: 150, message: "La descripcion no puede exceder 150 caracteres" }]}
          >
            <Input.TextArea rows={3} maxLength={150} showCount placeholder="Detalle de la promocion" />
          </Form.Item>

          <Form.Item name="promocionFechaInicio" label="Fecha inicio">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="promocionFechaFin" label="Fecha fin">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <Typography.Title level={5} style={{ marginTop: 8 }}>
          Imagenes
        </Typography.Title>

        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Checkbox
            checked={clearImages}
            onChange={(event) => {
              setClearImages(event.target.checked);
              if (event.target.checked) {
                setFileList([]);
              }
            }}
          >
            Eliminar imagenes actuales
          </Checkbox>

            <Upload
              beforeUpload={beforeUpload}
              onRemove={handleRemoveFile}
              fileList={fileList}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              listType="text"
              multiple
              maxCount={4}
            >
             <Button icon={<UploadOutlined />} disabled={clearImages || fileList.length >= 4}>
               Seleccionar nuevas imagenes
             </Button>
           </Upload>

          {fileList.length > 0 && (
            <Typography.Text type="secondary">
              Las imagenes seleccionadas reemplazaran las actuales al guardar.
            </Typography.Text>
          )}

          {existingImages.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {existingImages.map((image, index) => (
                <div
                  key={`${image.key || image.url}-${index}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 10,
                    background: "#fafafa",
                  }}
                >
                  <Image
                    src={image.url}
                    alt={`Imagen actual ${index + 1}`}
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
                  />
                </div>
              ))}
            </div>
          )}

          {clearImages && (
            <Typography.Text type="warning">
              Se eliminaran las imagenes actuales al guardar.
            </Typography.Text>
          )}

          {!existingImages.length && fileList.length === 0 && !clearImages && (
            <Space>
              <DeleteOutlined />
              <Typography.Text type="secondary">Sin imagenes cargadas.</Typography.Text>
            </Space>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default SellerProductInfoEditModal;
