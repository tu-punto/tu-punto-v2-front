import { useEffect, useMemo, useState } from "react";
import { Button, Divider, Empty, Modal, Spin, Tag, Typography, message } from "antd";
import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";

import { getProductByIdAPI } from "../../api/product";
import QRScanner from "../Sales/QRScanner";
import { findVariantCombination, getVariantLabel, normalizeText, toVariantRecord } from "./variantScanUtils";

const { Paragraph, Text, Title } = Typography;

type VariantInfoDetails = {
  productId: string;
  productName: string;
  categoryName: string;
  branchLabel: string;
  variantLabel: string;
  price: number;
  stock: number;
  description?: string;
  usage?: string;
  promotion?: {
    titulo?: string;
    descripcion?: string;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sellerId?: string | null;
  sellerLabel?: string;
  sucursalId?: string;
  sucursalLabel?: string;
};

const normalizeNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("es-BO");
};

const StockQRInfoModal = ({ open, onClose, sellerId, sellerLabel, sucursalId, sucursalLabel }: Props) => {
  const [scannerVisible, setScannerVisible] = useState(true);
  const [scannerSession, setScannerSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<VariantInfoDetails | null>(null);

  useEffect(() => {
    if (!open) {
      setScannerVisible(true);
      setScannerSession(0);
      setDetails(null);
      setLoading(false);
      return;
    }

    setScannerVisible(true);
    setScannerSession((current) => current + 1);
    setDetails(null);
  }, [open]);

  const promotionIsActive = useMemo(() => {
    if (!details?.promotion) return false;
    const now = Date.now();
    const start = details.promotion.fechaInicio ? new Date(details.promotion.fechaInicio).getTime() : null;
    const end = details.promotion.fechaFin ? new Date(details.promotion.fechaFin).getTime() : null;

    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }, [details]);

  const handleRestartScanner = () => {
    setDetails(null);
    setScannerVisible(false);
    window.setTimeout(() => {
      setScannerVisible(true);
      setScannerSession((current) => current + 1);
    }, 0);
  };

  const handleScannedVariant = async (item: any) => {
    if (sellerId && String(item?.id_vendedor || "") !== String(sellerId)) {
      message.error("El QR escaneado no pertenece al vendedor seleccionado.");
      return;
    }

    setLoading(true);
    try {
      const product = await getProductByIdAPI(String(item?.id_producto || ""));
      if (!product?._id) {
        message.error("No se pudo cargar la informacion del producto.");
        return;
      }

      const { combination } = findVariantCombination({
        product,
        preferredSucursalId: item?.sucursalId || sucursalId,
        variantKey: item?.variantKey,
        variantes: toVariantRecord(item?.variantes)
      });

      if (!combination) {
        message.error("No se encontro la variante escaneada en esta sucursal.");
        return;
      }

      setDetails({
        productId: String(product._id),
        productName: String(item?.nombre_producto || product?.nombre_producto || "Producto"),
        categoryName: String(item?.nombre_categoria || item?.categoria || product?.categoria?.categoria || "Sin categoria"),
        branchLabel: String(sucursalLabel || "Sucursal actual"),
        variantLabel: String(item?.variantLabel || getVariantLabel(combination?.variantes || {}) || "Variante"),
        price: normalizeNumber(combination?.precio ?? item?.precio),
        stock: normalizeNumber(combination?.stock ?? item?.stock),
        description: normalizeText(combination?.descripcion || "") || undefined,
        usage: normalizeText(combination?.uso || "") || undefined,
        promotion: combination?.promocion || null
      });
      setScannerVisible(false);
    } catch (error) {
      console.error("Error cargando informacion por QR:", error);
      message.error("No se pudo cargar la informacion de la variante.");
    } finally {
      setLoading(false);
    }
  };

  const isReady = Boolean(sellerId && sucursalId && sucursalId !== "all");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={940}
      destroyOnClose
      title="Informacion de producto por QR"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap"
          }}
        >
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Consulta QR
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {sellerLabel || "Vendedor"} | {sucursalLabel || "Sucursal actual"}
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleRestartScanner} disabled={!isReady}>
            Escanear otra variante
          </Button>
        </div>

        {!isReady ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Selecciona un vendedor y una sucursal para consultar informacion por QR."
          />
        ) : (
          <>
            {scannerVisible && (
              <div style={{ maxWidth: 720, marginInline: "auto", width: "100%" }}>
                <QRScanner
                  key={`stock-info-qr-${scannerSession}`}
                  onProductScanned={handleScannedVariant}
                  onClose={() => setScannerVisible(false)}
                  title="Escaner QR de informacion"
                  description="Escanea una variante para ver precio, descripcion, promocion y stock."
                  successLabel="Variante encontrada"
                  groupSuccessLabel="Variante del grupo encontrada"
                  appearance="simple"
                  simpleVideoMinHeight={240}
                />
              </div>
            )}

            <Spin spinning={loading}>
              {details ? (
                <div
                  style={{
                    border: "1px solid #e8e8e8",
                    borderRadius: 14,
                    background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                    padding: 18
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {details.productName}
                      </Title>
                      <Text type="secondary">{details.variantLabel}</Text>
                    </div>
                    <Tag color="blue" style={{ alignSelf: "flex-start" }}>
                      <InfoCircleOutlined /> {details.branchLabel}
                    </Tag>
                  </div>

                  <Divider style={{ margin: "14px 0" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <div>
                      <Text type="secondary">Precio</Text>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f" }}>Bs. {details.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <Text type="secondary">Stock actual</Text>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f" }}>{details.stock}</div>
                    </div>
                    <div>
                      <Text type="secondary">Categoria</Text>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#1f1f1f" }}>{details.categoryName}</div>
                    </div>
                  </div>

                  <Divider style={{ margin: "14px 0" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                    <div>
                      <Text strong>Descripcion</Text>
                      <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                        {details.description || "Sin descripcion registrada para esta variante."}
                      </Paragraph>
                    </div>
                    <div>
                      <Text strong>Promocion</Text>
                      {details.promotion ? (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {details.promotion.titulo && <Tag color={promotionIsActive ? "green" : "default"}>{details.promotion.titulo}</Tag>}
                            <Tag color={promotionIsActive ? "green" : "default"}>
                              {promotionIsActive ? "Vigente" : "No vigente"}
                            </Tag>
                          </div>
                          <Paragraph style={{ marginBottom: 0 }}>
                            {details.promotion.descripcion || "Promocion registrada sin descripcion."}
                          </Paragraph>
                          {(details.promotion.fechaInicio || details.promotion.fechaFin) && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatDate(details.promotion.fechaInicio) || "Sin inicio"} -{" "}
                              {formatDate(details.promotion.fechaFin) || "Sin fin"}
                            </Text>
                          )}
                        </div>
                      ) : (
                        <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                          Sin promocion registrada para esta variante.
                        </Paragraph>
                      )}
                    </div>
                  </div>
                </div>
              ) : !scannerVisible && !loading ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No se encontro informacion para la variante escaneada."
                />
              ) : null}
            </Spin>
          </>
        )}
      </div>
    </Modal>
  );
};

export default StockQRInfoModal;
