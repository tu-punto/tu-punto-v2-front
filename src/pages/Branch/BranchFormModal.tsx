import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Switch, TimePicker, Upload, message } from "antd";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  registerSucursalAPI,
  updateSucursalAPI,
  uploadSucursalHeaderImageAPI,
} from "../../api/sucursal";
import { IBranch } from "../../models/branchModel";

const deliveryCutoffSections = [
  {
    key: "weekdays",
    label: "Lunes a viernes",
    registrationField: "delivery_cutoff_weekdays_registration_time",
    closingField: "delivery_cutoff_weekdays_closing_time",
  },
  {
    key: "saturday",
    label: "Sábado",
    registrationField: "delivery_cutoff_saturday_registration_time",
    closingField: "delivery_cutoff_saturday_closing_time",
  },
  {
    key: "sunday",
    label: "Domingo",
    registrationField: "delivery_cutoff_sunday_registration_time",
    closingField: "delivery_cutoff_sunday_closing_time",
  },
] as const;

const pickupScheduleSections = [
  {
    key: "weekdays",
    label: "Lunes a viernes",
    openField: "pickup_schedule_weekdays_open_time",
    closeField: "pickup_schedule_weekdays_close_time",
  },
  {
    key: "saturday",
    label: "Sábado",
    openField: "pickup_schedule_saturday_open_time",
    closeField: "pickup_schedule_saturday_close_time",
  },
] as const;

const toTimePickerValue = (value?: string | null) => (value ? dayjs(value, "HH:mm") : undefined);

const BranchFormModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  branch: IBranch | null;
}> = ({ visible, onClose, onSubmit, branch }) => {
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

  const normalizeBranchPayload = (
    values: IBranch & {
      pickup_schedule_weekdays_open_time?: any;
      pickup_schedule_weekdays_close_time?: any;
      pickup_schedule_saturday_open_time?: any;
      pickup_schedule_saturday_close_time?: any;
      delivery_cutoff_weekdays_registration_time?: any;
      delivery_cutoff_weekdays_closing_time?: any;
      delivery_cutoff_saturday_registration_time?: any;
      delivery_cutoff_saturday_closing_time?: any;
      delivery_cutoff_sunday_registration_time?: any;
      delivery_cutoff_sunday_closing_time?: any;
      delivery_cutoff_start_time?: any;
      delivery_cutoff_end_time?: any;
      delivery_cutoff_time?: any;
    }
  ) => {
    const {
      delivery_cutoff_start_time: _legacyStart,
      delivery_cutoff_end_time: _legacyEnd,
      delivery_cutoff_time: _legacyTime,
      ...rest
    } = values as any;

    const formatPickupTime = (fieldValue: any) => (fieldValue?.format ? fieldValue.format("HH:mm") : "");
    const formatCutoffTime = (fieldValue: any) =>
      values.delivery_cutoff_enabled && fieldValue?.format ? fieldValue.format("HH:mm") : "";

    return {
      ...rest,
      pickup_schedule_weekdays_open_time: formatPickupTime(values.pickup_schedule_weekdays_open_time),
      pickup_schedule_weekdays_close_time: formatPickupTime(values.pickup_schedule_weekdays_close_time),
      pickup_schedule_saturday_open_time: formatPickupTime(values.pickup_schedule_saturday_open_time),
      pickup_schedule_saturday_close_time: formatPickupTime(values.pickup_schedule_saturday_close_time),
      delivery_cutoff_weekdays_registration_time: formatCutoffTime(values.delivery_cutoff_weekdays_registration_time),
      delivery_cutoff_weekdays_closing_time: formatCutoffTime(values.delivery_cutoff_weekdays_closing_time),
      delivery_cutoff_saturday_registration_time: formatCutoffTime(values.delivery_cutoff_saturday_registration_time),
      delivery_cutoff_saturday_closing_time: formatCutoffTime(values.delivery_cutoff_saturday_closing_time),
      delivery_cutoff_sunday_registration_time: formatCutoffTime(values.delivery_cutoff_sunday_registration_time),
      delivery_cutoff_sunday_closing_time: formatCutoffTime(values.delivery_cutoff_sunday_closing_time),
    };
  };

  const handleEdit = async (values: IBranch) => {
    if (!branch || !branch._id) {
      message.error("Error al actualizar la informacion");
      return;
    }

    try {
      setSaving(true);
      message.loading({ content: "Actualizando...", key: "branch-save" });

      const updateRes = await updateSucursalAPI(branch._id, normalizeBranchPayload(values as any));
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

      const createRes = await registerSucursalAPI(normalizeBranchPayload(values as any));
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
      const legacyRegistration = branch.delivery_cutoff_start_time || branch.delivery_cutoff_time || "";
      const legacyClosing = branch.delivery_cutoff_end_time || branch.delivery_cutoff_time || legacyRegistration;
      form.setFieldsValue({
        ...branch,
        pickup_schedule_weekdays_open_time: toTimePickerValue(
          branch.pickup_schedule_weekdays_open_time || branch.delivery_cutoff_weekdays_registration_time || legacyRegistration
        ),
        pickup_schedule_weekdays_close_time: toTimePickerValue(
          branch.pickup_schedule_weekdays_close_time || branch.delivery_cutoff_weekdays_closing_time || legacyClosing
        ),
        pickup_schedule_saturday_open_time: toTimePickerValue(
          branch.pickup_schedule_saturday_open_time || branch.delivery_cutoff_saturday_registration_time || legacyRegistration
        ),
        pickup_schedule_saturday_close_time: toTimePickerValue(
          branch.pickup_schedule_saturday_close_time || branch.delivery_cutoff_saturday_closing_time || legacyClosing
        ),
        delivery_cutoff_weekdays_registration_time: toTimePickerValue(
          branch.delivery_cutoff_weekdays_registration_time || legacyRegistration
        ),
        delivery_cutoff_weekdays_closing_time: toTimePickerValue(
          branch.delivery_cutoff_weekdays_closing_time || legacyClosing
        ),
        delivery_cutoff_saturday_registration_time: toTimePickerValue(
          branch.delivery_cutoff_saturday_registration_time || legacyRegistration
        ),
        delivery_cutoff_saturday_closing_time: toTimePickerValue(
          branch.delivery_cutoff_saturday_closing_time || legacyClosing
        ),
        delivery_cutoff_sunday_registration_time: toTimePickerValue(
          branch.delivery_cutoff_sunday_registration_time || legacyRegistration
        ),
        delivery_cutoff_sunday_closing_time: toTimePickerValue(
          branch.delivery_cutoff_sunday_closing_time || legacyClosing
        ),
      });
      setPreviewUrl(branch.imagen_header || "");
    } else {
      form.resetFields();
      setPreviewUrl("");
    }
    setHeaderFile(null);
  }, [visible, branch, form]);

  return (
    <Modal
      title={branch ? "Editar Sucursal" : "Agregar Sucursal"}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form layout="vertical" form={form} onFinish={branch ? handleEdit : handleCreate}>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="nombre"
          label="Nombre"
          rules={[{ required: true, message: "Por favor ingrese el nombre" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="direccion"
          label="Direccion"
          rules={[{ required: true, message: "Por favor ingrese la direccion" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="ciudad"
          label="Ciudad"
          rules={[{ required: true, message: "Por favor ingrese la ciudad" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="telefono"
          label="Telefono"
          rules={[
            { required: true, message: "Por favor ingrese el telefono" },
            { pattern: /^[0-9]+$/, message: "Solo se permiten numeros" },
          ]}
        >
          <Input className="w-full" type="tel" maxLength={13} />
        </Form.Item>

        <div className="mb-2 mt-2 font-medium text-gray-800">Horario para recojo</div>
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          {pickupScheduleSections.map((section) => (
            <div key={section.key} className="rounded-lg border border-gray-100 p-3">
              <div className="mb-3 font-medium text-gray-800">{section.label}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Form.Item
                  className="text-mobile-sm xl:text-desktop-sm"
                  name={section.openField}
                  label="Hora de apertura"
                  rules={[{ required: true, message: "Selecciona la hora de apertura" }]}
                >
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  className="text-mobile-sm xl:text-desktop-sm"
                  name={section.closeField}
                  label="Hora de cierre"
                  rules={[{ required: true, message: "Selecciona la hora de cierre" }]}
                >
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </div>
            </div>
          ))}
        </div>

        <Form.Item
          className="text-mobile-sm xl:text-desktop-sm"
          name="delivery_cutoff_enabled"
          label="Bloqueo horario delivery"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          shouldUpdate={(prev, current) => prev.delivery_cutoff_enabled !== current.delivery_cutoff_enabled}
          noStyle
        >
          {({ getFieldValue }) =>
            getFieldValue("delivery_cutoff_enabled") ? (
              <div className="space-y-4">
                {deliveryCutoffSections.map((section) => (
                  <div key={section.key} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 font-medium text-gray-800">{section.label}</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Form.Item
                        className="text-mobile-sm xl:text-desktop-sm"
                        name={section.registrationField}
                        label="Hora límite de registro"
                        dependencies={[section.closingField]}
                        rules={[
                          { required: true, message: "Selecciona la hora límite de registro" },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const closing = getFieldValue(section.closingField);
                              if (!value || !closing) return Promise.resolve();
                              if (value.isAfter(closing)) {
                                return Promise.reject(new Error("La hora límite de registro debe ser menor o igual a la de cierre operativo"));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <TimePicker format="HH:mm" style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        className="text-mobile-sm xl:text-desktop-sm"
                        name={section.closingField}
                        label="Hora de cierre operativo"
                        dependencies={[section.registrationField]}
                        rules={[
                          { required: true, message: "Selecciona la hora de cierre operativo" },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const registration = getFieldValue(section.registrationField);
                              if (!value || !registration) return Promise.resolve();
                              if (value.isBefore(registration)) {
                                return Promise.reject(new Error("La hora de cierre operativo debe ser mayor o igual a la hora límite de registro"));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <TimePicker format="HH:mm" style={{ width: "100%" }} />
                      </Form.Item>
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          }
        </Form.Item>

        <Form.Item className="text-mobile-sm xl:text-desktop-sm" label="Imagen de header (AWS)">
          <Upload
            beforeUpload={beforeUploadHeader}
            onRemove={() => {
              setHeaderFile(null);
              setPreviewUrl(branch?.imagen_header || "");
            }}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            maxCount={1}
            listType="text"
          >
            <Button icon={<UploadOutlined />}>Seleccionar imagen</Button>
          </Upload>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview header sucursal"
              className="mt-3 h-20 w-full rounded-md object-cover border border-gray-200"
            />
          ) : (
            <p className="mt-2 text-xs text-gray-500">Sin imagen cargada.</p>
          )}
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            {branch ? "Actualizar" : "Agregar"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchFormModal;
