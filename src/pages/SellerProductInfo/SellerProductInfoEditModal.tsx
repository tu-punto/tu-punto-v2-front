import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import dayjs from "dayjs";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { updateVariantExtrasBySellerAPI } from "../../api/product";

import "./SellerProductInfoEditModal.css";

type SellerProductInfoRow = {
  productId: string;
  variantKey: string;
  displayName: string;
  representativeSucursalId?: string;
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

const toUploadFileFromExisting = (
  image: { url: string; key?: string },
  index: number
): UploadFile => ({
  uid: image.key || image.url || `existing-${index}`,
  name: image.key || `imagen-${index + 1}`,
  status: "done",
  url: image.url,
});

const isPreviewBlob = (value?: string) => Boolean(value && value.startsWith("blob:"));
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_IMAGES = 4;

const SellerProductInfoEditModal = ({ visible, record, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [showPromotionFields, setShowPromotionFields] = useState(false);
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [draggedImageUid, setDraggedImageUid] = useState<string | null>(null);
  const [dragOverImageUid, setDragOverImageUid] = useState<string | null>(null);
  const imageFileListRef = useRef<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasPromotionData = useMemo(() => {
    if (!record) return false;
    return Boolean(
      String(record.promocionTitulo || "").trim() ||
        String(record.promocionDescripcion || "").trim() ||
        record.promocionFechaInicio ||
        record.promocionFechaFin
    );
  }, [record]);

  useEffect(() => {
    if (!visible || !record) return;

    imageFileListRef.current.forEach((file) => {
      if (isPreviewBlob(file.url)) {
        URL.revokeObjectURL(file.url as string);
      }
    });

    form.setFieldsValue({
      descripcion: record.descripcion || "",
      uso: record.uso || "",
      promocionTitulo: record.promocionTitulo || "",
      promocionDescripcion: record.promocionDescripcion || "",
      promocionFechaInicio: toDayjs(record.promocionFechaInicio),
      promocionFechaFin: toDayjs(record.promocionFechaFin),
    });

    setShowUsage(Boolean(String(record.uso || "").trim()));
    setShowPromotionFields(hasPromotionData);
    setImageFileList((record.imagenes || []).filter((image) => image?.url).map(toUploadFileFromExisting));
  }, [visible, record, form, hasPromotionData]);

  useEffect(() => {
    imageFileListRef.current = imageFileList;
  }, [imageFileList]);

  useEffect(() => {
    return () => {
      imageFileListRef.current.forEach((file) => {
        if (isPreviewBlob(file.url)) {
          URL.revokeObjectURL(file.url as string);
        }
      });
    };
  }, []);

  const handleFilesAdd = (files: File[]) => {
    if (!files.length) return;

    const currentFiles = imageFileListRef.current;
    const availableSlots = MAX_IMAGES - currentFiles.length;

    if (availableSlots <= 0) {
      message.warning("Solo puedes cargar hasta 4 imagenes.");
      return;
    }

    const validFiles: UploadFile[] = [];
    let invalidTypeCount = 0;
    let duplicateCount = 0;

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        invalidTypeCount += 1;
        continue;
      }

      const duplicateExists = [...currentFiles, ...validFiles].some((item) => {
        const original = item.originFileObj as File | undefined;
        if (!original) return false;
        return (
          original.name === file.name &&
          original.size === file.size &&
          original.lastModified === file.lastModified
        );
      });

      if (duplicateExists) {
        duplicateCount += 1;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      validFiles.push({
        uid: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "done",
        originFileObj: file,
        url: previewUrl,
        thumbUrl: previewUrl,
      });
    }

    const acceptedFiles = validFiles.slice(0, availableSlots);
    const skippedByLimit = validFiles.length - acceptedFiles.length;

    if (invalidTypeCount > 0) {
      message.warning("Solo se permiten imagenes PNG, JPG, JPEG o WEBP.");
    }

    if (duplicateCount > 0) {
      message.info("Algunas imagenes repetidas no se agregaron.");
    }

    if (skippedByLimit > 0) {
      validFiles.slice(availableSlots).forEach((file) => {
        if (isPreviewBlob(file.url)) {
          URL.revokeObjectURL(file.url as string);
        }
      });
      message.warning("Solo puedes cargar hasta 4 imagenes.");
    }

    if (!acceptedFiles.length) return;

    setImageFileList((current) => [...current, ...acceptedFiles]);
  };

  const handleRemoveFile = (file: UploadFile) => {
    if (isPreviewBlob(file.url)) {
      URL.revokeObjectURL(file.url as string);
    }

    setImageFileList((current) => current.filter((item) => item.uid !== file.uid));
    return true;
  };

  const moveImage = (uid: string, direction: "left" | "right") => {
    setImageFileList((current) => {
      const index = current.findIndex((item) => item.uid === uid);
      if (index === -1) return current;

      const nextIndex = direction === "left" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFilesAdd(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    handleFilesAdd(Array.from(event.dataTransfer.files || []));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const reorderImageCards = (sourceUid: string, targetUid: string) => {
    if (!sourceUid || !targetUid || sourceUid === targetUid) return;

    setImageFileList((current) => {
      const sourceIndex = current.findIndex((item) => String(item.uid) === sourceUid);
      const targetIndex = current.findIndex((item) => String(item.uid) === targetUid);

      if (sourceIndex === -1 || targetIndex === -1) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const submitChanges = async () => {
    if (!record) return;

    try {
      const values = await form.validateFields();
      if (!record.representativeSucursalId) {
        message.error("No se pudo identificar la sucursal de esta variante.");
        return;
      }
      setSaving(true);

      const retainedImages = imageFileList
        .filter((file) => !file.originFileObj && file.url)
        .map((file) => ({
          uid: String(file.uid),
          url: String(file.url),
          key: typeof file.uid === "string" ? file.uid : undefined,
        }));

      const newImageFiles = imageFileList.filter((file) => file.originFileObj);

      const payload = {
        productId: record.productId,
        sucursalId: String(record.representativeSucursalId || ""),
        variantKey: record.variantKey,
        descripcion: values.descripcion || "",
        uso: showUsage ? values.uso || "" : "",
        promocion: {
          titulo: showPromotionFields ? values.promocionTitulo || undefined : undefined,
          descripcion: showPromotionFields ? values.promocionDescripcion || undefined : undefined,
          fechaInicio:
            showPromotionFields && values.promocionFechaInicio ? values.promocionFechaInicio.toISOString() : null,
          fechaFin: showPromotionFields && values.promocionFechaFin ? values.promocionFechaFin.toISOString() : null,
        },
        retainedImages,
        imageOrder: imageFileList.map((file) => String(file.uid)),
        newImageUids: newImageFiles.map((file) => String(file.uid)),
        imageFiles: newImageFiles
          .map((file) => file.originFileObj)
          .filter((file): file is File => Boolean(file)),
      };

      const response = await updateVariantExtrasBySellerAPI(payload);
      if (!response?.success) {
        message.error(response?.message || "No se pudo actualizar la variante.");
        return;
      }

      message.success("Informacion de la variante actualizada correctamente.");
      await onSuccess();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Error actualizando informacion de la variante:", error);
      message.error(error?.message || "Ocurrio un error al actualizar la variante.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    try {
      await form.validateFields();
      Modal.confirm({
        title: "Guardar cambios de la variante",
        icon: <ExclamationCircleOutlined />,
        content: "Se actualizaran la descripción, uso, promoción e imágenes de esta variante.",
        okText: "Guardar",
        cancelText: "Cancelar",
        onOk: submitChanges,
      });
    } catch (_error) {
      return;
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      confirmLoading={saving}
      width={920}
      cancelText="Cancelar"
      title={record ? `Producto: ${record.displayName}` : "Editar variante"}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleConfirmSave}>
          Guardar cambios
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="seller-product-info-edit-form">
        <div className="seller-product-info-edit-grid">
          <section className="seller-product-info-edit-section">
            <div className="seller-product-info-edit-section-header">
              <div>
                <div className="seller-product-info-edit-title">Descripción</div>
                <div className="seller-product-info-edit-subtitle">Resume claramente la variante para el cliente.</div>
              </div>
            </div>
            <Form.Item
              name="descripcion"
              style={{ marginBottom: 0 }}
              rules={[{ max: 500, message: "La descripcion no puede exceder 500 caracteres" }]}
            >
              <Input.TextArea rows={5} maxLength={500} showCount placeholder="Describe la variante..." />
            </Form.Item>
          </section>

          <section className="seller-product-info-edit-section">
            <div className="seller-product-info-edit-section-header seller-product-info-edit-section-header-inline">
              <div>
                <div className="seller-product-info-edit-title">Uso</div>
                <div className="seller-product-info-edit-subtitle">Agrega una guia breve solo si aporta valor.</div>
              </div>
              <Checkbox
                checked={showUsage}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setShowUsage(checked);
                  if (!checked) {
                    form.setFieldValue("uso", "");
                  }
                }}
              >
                Añadir explicacion de uso
              </Checkbox>
            </div>

            {showUsage ? (
              <Form.Item
                name="uso"
                style={{ marginBottom: 0 }}
                label="Explicacion de uso"
                rules={[{ max: 500, message: "El uso no puede exceder 500 caracteres" }]}
              >
                <Input.TextArea rows={5} maxLength={500} showCount placeholder="Indica el uso recomendado..." />
              </Form.Item>
            ) : (
              <div className="seller-product-info-edit-empty-state">
                Activa esta opcion si quieres mostrar una recomendacion de uso para esta variante.
              </div>
            )}
          </section>
        </div>

        <section className="seller-product-info-edit-section">
          <div className="seller-product-info-edit-section-header seller-product-info-edit-section-header-inline">
            <div>
              <div className="seller-product-info-edit-title">Promoción</div>
              <div className="seller-product-info-edit-subtitle">
                Muestra una oferta temporal solo cuando la variante la necesite.
              </div>
            </div>

            {!showPromotionFields ? (
              <Button type="dashed" onClick={() => setShowPromotionFields(true)}>
                Anadir promoción
              </Button>
            ) : (
              <Button
                danger
                ghost
                onClick={() => {
                  setShowPromotionFields(false);
                  form.setFieldsValue({
                    promocionTitulo: "",
                    promocionDescripcion: "",
                    promocionFechaInicio: null,
                    promocionFechaFin: null,
                  });
                }}
              >
                Quitar promoción
              </Button>
            )}
          </div>

          {showPromotionFields ? (
            <div className="seller-product-info-edit-grid">
              <Form.Item
                name="promocionTitulo"
                label="Titulo"
                rules={[{ max: 60, message: "El titulo no puede exceder 60 caracteres" }]}
              >
                <Input maxLength={60} showCount placeholder="Titulo de la promoción" />
              </Form.Item>

              <Form.Item
                name="promocionDescripcion"
                label="Descripción"
                rules={[{ max: 150, message: "La descripción no puede exceder 150 caracteres" }]}
              >
                <Input.TextArea rows={3} maxLength={150} showCount placeholder="Detalle de la promoción" />
              </Form.Item>

              <Form.Item name="promocionFechaInicio" label="Fecha inicio">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item name="promocionFechaFin" label="Fecha fin">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </div>
          ) : (
            <div className="seller-product-info-edit-empty-state">
              La promoción queda oculta hasta que decidas agregarla.
            </div>
          )}
        </section>

        <section className="seller-product-info-edit-section">
          <div className="seller-product-info-edit-section-header">
            <div>
              <div className="seller-product-info-edit-title">Imagenes</div>
              <div className="seller-product-info-edit-subtitle">
                Puedes cargar hasta 4 imagenes. La primera sera la principal y aparecera destacada.
              </div>
            </div>
            <Typography.Text type="secondary">{imageFileList.length}/4</Typography.Text>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />

          <div
            className={`seller-product-info-edit-dropzone ${
              isDragActive ? "seller-product-info-edit-dropzone-active" : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.currentTarget === event.target) {
                setIsDragActive(false);
              }
            }}
            onDrop={handleDrop}
          >
            <div className="seller-product-info-edit-dropzone-copy">
              <InboxOutlined />
              <div>
                <div className="seller-product-info-edit-dropzone-title">Arrastra y suelta imagenes aqui</div>
                <div className="seller-product-info-edit-dropzone-subtitle">
                  O agrégalas desde la última card. Formatos permitidos: PNG, JPG, JPEG y WEBP.
                </div>
              </div>
            </div>
          </div>

          {imageFileList.length > 0 && (
            <div className="seller-product-info-edit-carousel-shell">
              <div className="seller-product-info-edit-carousel-header">
                <div className="seller-product-info-edit-carousel-title">Carrusel de imagenes</div>
                <div className="seller-product-info-edit-carousel-subtitle">
                  Reordena con las flechas. La primera sera la portada principal.
                </div>
              </div>

              <div className="seller-product-info-edit-image-grid">
              {imageFileList.map((file, index) => (
                <div
                  key={String(file.uid)}
                  className={`seller-product-info-edit-image-card ${
                    index === 0 ? "seller-product-info-edit-image-card-primary" : ""
                  } ${dragOverImageUid === String(file.uid) ? "seller-product-info-edit-image-card-drop-target" : ""}`}
                  draggable
                  onDragStart={() => {
                    setDraggedImageUid(String(file.uid));
                  }}
                  onDragEnd={() => {
                    setDraggedImageUid(null);
                    setDragOverImageUid(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedImageUid && draggedImageUid !== String(file.uid)) {
                      setDragOverImageUid(String(file.uid));
                    }
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target) {
                      setDragOverImageUid((current) => (current === String(file.uid) ? null : current));
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedImageUid) {
                      reorderImageCards(draggedImageUid, String(file.uid));
                    }
                    setDraggedImageUid(null);
                    setDragOverImageUid(null);
                  }}
                >
                  <button
                    type="button"
                    className="seller-product-info-edit-image-remove"
                    onClick={() => handleRemoveFile(file)}
                    aria-label="Quitar imagen"
                  >
                    <CloseOutlined />
                  </button>

                  {index === 0 && <div className="seller-product-info-edit-image-badge">Principal</div>}

                  <div className="seller-product-info-edit-image-stage">
                    <img
                      src={file.url}
                      alt={file.name || `Imagen ${index + 1}`}
                      className="seller-product-info-edit-image-preview"
                    />

                    <div className="seller-product-info-edit-image-overlay">
                      <Button
                        size="small"
                        type="text"
                        className="seller-product-info-edit-image-nav seller-product-info-edit-image-nav-left"
                        icon={<ArrowLeftOutlined />}
                        disabled={index === 0}
                        onClick={() => moveImage(String(file.uid), "left")}
                      />
                      <Button
                        size="small"
                        type="text"
                        className="seller-product-info-edit-image-nav seller-product-info-edit-image-nav-right"
                        icon={<ArrowRightOutlined />}
                        disabled={index === imageFileList.length - 1}
                        onClick={() => moveImage(String(file.uid), "right")}
                      />
                    </div>
                  </div>

                  <div className="seller-product-info-edit-image-footer">
                    <Typography.Text ellipsis style={{ maxWidth: "100%" }}>
                      {file.name || `Imagen ${index + 1}`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      #{index + 1}
                    </Typography.Text>
                  </div>
                </div>
              ))}

                {imageFileList.length < MAX_IMAGES && (
                  <button
                    type="button"
                    className="seller-product-info-edit-add-card"
                    onClick={openFilePicker}
                  >
                    <PlusOutlined />
                    <span>Anadir imagen</span>
                    <small>{MAX_IMAGES - imageFileList.length} espacio(s) disponible(s)</small>
                  </button>
                )}
              </div>
            </div>
          )}

          {imageFileList.length === 0 && (
            <button
              type="button"
              className="seller-product-info-edit-empty-upload"
              onClick={openFilePicker}
            >
              <PlusOutlined />
              <span>Seleccionar imagenes</span>
            </button>
          )}
        </section>
      </Form>
    </Modal>
  );
};

export default SellerProductInfoEditModal;
