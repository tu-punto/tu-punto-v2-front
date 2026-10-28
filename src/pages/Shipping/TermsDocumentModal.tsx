import { useEffect, useState } from "react";
import { Button, Modal, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { getTermsDocumentAPI, replaceTermsDocumentAPI } from "../../api/termsDocument";

export default function TermsDocumentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    getTermsDocumentAPI().then((res) => setUrl(String(res?.data?.url || ""))).catch(() => message.error("No se pudo cargar el documento actual"));
  }, [visible]);

  const save = async () => {
    if (!file) return message.warning("Selecciona un archivo PDF");
    setLoading(true);
    try {
      const res = await replaceTermsDocumentAPI(file);
      setUrl(String(res?.data?.url || ""));
      setFile(null);
      setFileList([]);
      message.success("Documento actualizado");
    } catch (error: any) {
      message.error(error?.response?.data?.message || "No se pudo actualizar el documento");
    } finally { setLoading(false); }
  };

  return <Modal open={visible} title="Términos y condiciones de paquetería" onCancel={onClose}
    footer={<Button type="primary" loading={loading} onClick={save}>Actualizar documento</Button>}>
    {url && <p><a href={url} target="_blank" rel="noreferrer">Ver documento actual</a></p>}
    <Upload
      accept="application/pdf"
      maxCount={1}
      fileList={fileList}
      beforeUpload={() => false}
      onChange={({ fileList: nextFileList }) => {
        const next = nextFileList.slice(-1);
        setFileList(next);
        setFile((next[0]?.originFileObj as File | undefined) || null);
      }}
      onRemove={() => { setFile(null); setFileList([]); }}
    >
      <Button icon={<UploadOutlined />}>Seleccionar PDF</Button>
    </Upload>
  </Modal>;
}
