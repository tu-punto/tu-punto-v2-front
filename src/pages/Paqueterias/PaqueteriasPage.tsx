import { UploadOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Form, Image, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { useEffect, useState } from "react";
import { checkPaqueteriaGuideCodeAPI, createPaqueteriaAPI, getPaqueteriasAPI, updatePaqueteriaAPI, uploadPaqueteriaLogoAPI } from "../../api/paqueterias";

const DEFAULT_PRIMARY = "#1677ff";
const DEFAULT_SECONDARY = "#ffffff";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const allowedLogoTypes = ["image/jpeg", "image/png", "image/webp"];

export default function PaqueteriasPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form] = Form.useForm();
  const guideCode = Number(Form.useWatch("codigo_guia", form) || 3);
  const primaryColor = String(Form.useWatch("color_primario", form) || DEFAULT_PRIMARY);
  const secondaryColor = String(Form.useWatch("color_secundario", form) || DEFAULT_SECONDARY);
  const companyType = String(Form.useWatch("tipo", form) || "operativa");
  const guideFormat = String(Form.useWatch("formato_guia", form) || "libre");

  const load = async () => {
    try {
      setRows((await getPaqueteriasAPI()).data || []);
    } catch {
      message.error("No se pudieron cargar las paqueterías");
    }
  };

  useEffect(() => { void load(); }, []);

  const edit = (row?: any) => {
    const next = row || { tipo: "operativa", activo: true, multa_cada_dias: 7, monto_multa: 0, tarifa_fija: 0, formato_guia: "libre", color_primario: DEFAULT_PRIMARY, color_secundario: DEFAULT_SECONDARY };
    setSelected(row || null);
    form.setFieldsValue({ ...next, color_primario: next.color_primario || DEFAULT_PRIMARY, color_secundario: next.color_secundario || DEFAULT_SECONDARY });
    setPreviewUrl(next.logo_url || "");
    setLogoFile(null);
    setOpen(true);
  };

  const checkCode = async (value?: number) => {
    const code = Math.floor(Number(value));
    if (!Number.isFinite(code) || code < 2) return false;
    setCheckingCode(true);
    try {
      const response = await checkPaqueteriaGuideCodeAPI(code, selected?._id);
      if (!response?.available) {
        form.setFields([{ name: "codigo_guia", errors: ["Este código ya está asignado a otra paquetería"] }]);
        return false;
      }
      form.setFields([{ name: "codigo_guia", errors: [] }]);
      return true;
    } catch {
      message.error("No se pudo validar el código de guía");
      return false;
    } finally {
      setCheckingCode(false);
    }
  };

  const beforeUploadLogo = (file: File) => {
    if (!allowedLogoTypes.includes(file.type)) {
      message.error("El logo debe ser PNG, JPG o WebP");
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_LOGO_BYTES) {
      message.error("El logo no puede superar 5 MB");
      return Upload.LIST_IGNORE;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
    return false;
  };

  const save = async (values: any) => {
    const codeIsAvailable = values.tipo === "externa" || await checkCode(values.codigo_guia);
    if (!codeIsAvailable) return;
    setSaving(true);
    try {
      const saved = selected?._id
        ? await updatePaqueteriaAPI(selected._id, values)
        : await createPaqueteriaAPI(values);
      const id = selected?._id || saved?.data?._id;
      if (!id) throw new Error("No se pudo identificar la paquetería guardada");
      if (logoFile) await uploadPaqueteriaLogoAPI(id, logoFile);
      message.success(logoFile ? "Paquetería y logo guardados" : "Paquetería guardada");
      setOpen(false);
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.msg || error?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const uploadFileList: UploadFile[] = logoFile ? [{ uid: "logo", name: logoFile.name, status: "done", originFileObj: logoFile as any }] : [];
  const displayedGuideCode = Number.isInteger(guideCode) && guideCode >= 2 ? guideCode : 3;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paqueterías</h1>
        <Button type="primary" onClick={() => edit()}>Nueva paquetería</Button>
      </div>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: "Nombre", dataIndex: "nombre" },
          { title: "Código", dataIndex: "codigo_guia", render: (value) => `-${value}` },
          { title: "Tarifa", dataIndex: "tarifa_fija", render: (value) => `Bs. ${Number(value).toFixed(2)}` },
          { title: "Multa", render: (_, row) => `Bs. ${row.monto_multa} / ${row.multa_cada_dias} días` },
          { title: "Estado", dataIndex: "activo", render: (value) => <Tag color={value ? "green" : "default"}>{value ? "Activa" : "Inactiva"}</Tag> },
          { title: "", render: (_, row) => <Button onClick={() => edit(row)}>Editar</Button> },
        ]}
      />
      <Modal title={selected ? "Editar paquetería" : "Nueva paquetería"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose width={680}>
        <Form form={form} layout="vertical" onFinish={save} className="pt-2">
          <Form.Item name="nombre" label="Nombre comercial" rules={[{ required: true, message: "Ingresa el nombre comercial" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo de paquetería" rules={[{ required: true }]}><Select options={[{ value: "operativa", label: "Operativa Tu Punto" }, { value: "externa", label: "Externa (portal aislado)" }]} /></Form.Item>
          {companyType === "externa" && <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><Form.Item name="slug" label="URL de acceso" rules={[{ required: true }]} extra="Ejemplo: /paqueteria/mi-paqueteria"><Input addonBefore="/paqueteria/" /></Form.Item><Form.Item name="formato_guia" label="Formato de guía propia"><Select options={[{ value: "libre", label: "Guía libre" }, { value: "tupunto", label: "Formato Tu Punto: EXT-000001" }, { value: "personalizado", label: "Formato personalizado" }]} /></Form.Item>{guideFormat === "personalizado" && <Form.Item name="prefijo_guia" label="Prefijo obligatorio" rules={[{ required: true }]}><Input placeholder="Ej. RAP-" /></Form.Item>}</div>}
          {companyType !== "externa" && <>
          <Form.Item name="codigo_guia" label="Código de guía (desde 2)" rules={[{ required: true, message: "Ingresa un código" }, { type: "number", min: 2, message: "El código debe ser 2 o mayor" }]}>
            <InputNumber min={2} precision={0} style={{ width: "100%" }} onBlur={(event) => void checkCode(Number(event.target.value))} status={checkingCode ? "warning" : undefined} />
          </Form.Item>
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" style={{ borderLeft: `4px solid ${primaryColor}` }}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ejemplo de guía</div>
            <div className="mt-1 text-lg font-semibold tracking-wide text-slate-700" style={{ fontVariantNumeric: "tabular-nums" }}>
              AB-00000<span style={{ color: primaryColor }}>-{displayedGuideCode}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">El último número identifica a esta paquetería.</div>
          </div>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name="tarifa_fija" label="Tarifa fija (Bs.)" rules={[{ required: true, message: "Ingresa la tarifa" }]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="multa_cada_dias" label="Multa cada X días" rules={[{ required: true, message: "Ingresa el intervalo" }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="monto_multa" label="Monto de multa (Bs.)" rules={[{ required: true, message: "Ingresa el monto" }]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="activo" label="Activa" valuePropName="checked"><Switch /></Form.Item>
          </div>
          </>}
          <div className="mb-5 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Identidad visual</div>
            <Space align="start" size={16} wrap>
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white" style={{ borderColor: primaryColor }}>
                {previewUrl ? <Image src={previewUrl} alt="Vista previa del logo" preview={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span className="text-xs text-slate-400">Logo</span>}
              </div>
              <div>
                <Upload accept="image/png,image/jpeg,image/webp" maxCount={1} beforeUpload={beforeUploadLogo} fileList={uploadFileList} onRemove={() => { setLogoFile(null); setPreviewUrl(selected?.logo_url || ""); }}>
                  <Button icon={<UploadOutlined />}>Subir logo</Button>
                </Upload>
                <div className="mt-2 text-xs text-slate-500">PNG, JPG o WebP · máximo 5 MB</div>
              </div>
            </Space>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><div className="mb-1 text-sm text-slate-700">Color principal</div><ColorPicker value={primaryColor} onChange={(color) => form.setFieldValue("color_primario", color.toHexString())} showText /></div>
              <div><div className="mb-1 text-sm text-slate-700">Color secundario</div><ColorPicker value={secondaryColor} onChange={(color) => form.setFieldValue("color_secundario", color.toHexString())} showText /></div>
            </div>
          </div>
          <Button htmlType="submit" type="primary" loading={saving}>Guardar</Button>
        </Form>
      </Modal>
    </div>
  );
}
