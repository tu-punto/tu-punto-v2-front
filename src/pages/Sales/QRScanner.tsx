import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { Alert, Button, Empty, Input, Modal, Tag, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  InboxOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { resolveVariantQRGroupPayloadAPI, resolveVariantQRPayloadAPI } from "../../api/qr";

const { Text, Title } = Typography;

interface QRScannerProps {
  onProductScanned: (product: any) => void;
  onClose?: () => void;
}

interface ScannedVariantItem {
  id_producto: string;
  nombre_producto: string;
  id_vendedor: string;
  variantKey: string;
  variantLabel: string;
  variantes: Record<string, string>;
  precio: number;
  stock: number;
  sucursalId?: string;
  source?: string;
  groupId?: string;
  groupCode?: string;
  groupName?: string;
}

interface GroupResolvedItem {
  productId: string;
  productName: string;
  sellerId: string;
  variantKey: string;
  variantLabel: string;
  variantes: Record<string, string>;
  precio: number;
  stock: number;
  sucursalId?: string;
  status: "available" | "out_of_stock" | "missing_product" | "missing_variant" | "branch_unavailable";
  message?: string;
}

interface GroupResolution {
  id: string;
  name: string;
  sellerId: string;
  groupCode: string;
  qrPayload: string;
  qrImagePath: string;
  active: boolean;
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  items: GroupResolvedItem[];
  type: "group";
}

type FlashState = "success" | "error" | "info" | null;

const isGroupPayload = (payload: string) => {
  const value = String(payload || "").trim();
  return /^TP\|v1\|PGRP\|/i.test(value) || /^PGRP-/i.test(value);
};

const normalizeVariantItem = (
  item: Partial<ScannedVariantItem> & Record<string, any>,
  extra?: Partial<ScannedVariantItem>
): ScannedVariantItem => ({
  id_producto: String(item.id_producto ?? item.productId ?? ""),
  nombre_producto: String(item.nombre_producto ?? item.productName ?? "Producto"),
  id_vendedor: String(item.id_vendedor ?? item.sellerId ?? ""),
  variantKey: String(item.variantKey ?? ""),
  variantLabel: String(item.variantLabel ?? ""),
  variantes: (item.variantes || {}) as Record<string, string>,
  precio: Number(item.precio ?? item.price ?? 0),
  stock: Number(item.stock ?? 0),
  sucursalId: item.sucursalId ? String(item.sucursalId) : undefined,
  source: String(item.source ?? extra?.source ?? ""),
  groupId: extra?.groupId,
  groupCode: extra?.groupCode,
  groupName: extra?.groupName
});

const getStatusMeta = (status: GroupResolvedItem["status"]) => {
  switch (status) {
    case "available":
      return { color: "green", label: "Disponible" };
    case "out_of_stock":
      return { color: "gold", label: "Sin stock" };
    case "branch_unavailable":
      return { color: "orange", label: "Otra sucursal" };
    case "missing_product":
      return { color: "red", label: "Producto eliminado" };
    default:
      return { color: "default", label: "No disponible" };
  }
};

function QRScanner({ onProductScanned, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const lastReadRef = useRef<{ payload: string; ts: number }>({ payload: "", ts: 0 });
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [flashState, setFlashState] = useState<FlashState>(null);
  const [flashLabel, setFlashLabel] = useState("");
  const [groupSelection, setGroupSelection] = useState<GroupResolution | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const showFlash = (type: Exclude<FlashState, null>, label: string) => {
    setFlashState(type);
    setFlashLabel(label);
    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFlashState(null);
      setFlashLabel("");
    }, 2200);
  };

  const clearScannerIntervals = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const stopCamera = () => {
    trackRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const pauseScanning = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const closeScanner = (notifyTimeout = false) => {
    setIsScanning(false);
    setGroupSelection(null);
    clearScannerIntervals();
    stopCamera();
    if (notifyTimeout) {
      message.info("Escaner cerrado por inactividad");
    }
    onClose?.();
  };

  const resetInactivityCountdown = () => {
    if (!isScanning) return;
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    let remaining = 15;
    setSecondsLeft(remaining);
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        closeScanner(true);
      }
    }, 1000);
  };

  const improveTrackSettings = async (track: MediaStreamTrack) => {
    const anyTrack = track as MediaStreamTrack & {
      getCapabilities?: () => Record<string, any>;
      applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
    };

    const capabilities = anyTrack.getCapabilities?.();
    if (!capabilities || !anyTrack.applyConstraints) return;

    const advanced: Record<string, any> = {};

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
      advanced.focusMode = "continuous";
    }

    if (typeof capabilities.zoom?.max === "number" && capabilities.zoom.max >= 1.5) {
      advanced.zoom = Math.min(2, capabilities.zoom.max);
    }

    if (capabilities.torch) {
      advanced.torch = false;
    }

    if (!Object.keys(advanced).length) return;

    try {
      await anyTrack.applyConstraints({
        advanced: [advanced]
      });
    } catch (error) {
      console.debug("No se pudieron aplicar mejoras de enfoque al scanner", error);
    }
  };

  const tryDecode = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const fullFrame = context.getImageData(0, 0, width, height);
    const directCode = jsQR(fullFrame.data, fullFrame.width, fullFrame.height, {
      inversionAttempts: "attemptBoth"
    });
    if (directCode?.data) {
      return directCode.data;
    }

    const cropWidth = Math.floor(width * 0.72);
    const cropHeight = Math.floor(height * 0.72);
    const offsetX = Math.floor((width - cropWidth) / 2);
    const offsetY = Math.floor((height - cropHeight) / 2);
    const croppedFrame = context.getImageData(offsetX, offsetY, cropWidth, cropHeight);
    const croppedCode = jsQR(croppedFrame.data, croppedFrame.width, croppedFrame.height, {
      inversionAttempts: "attemptBoth"
    });

    return croppedCode?.data || null;
  };

  const startScanning = () => {
    setIsScanning(true);
    setSecondsLeft(15);

    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
    }
    scanIntervalRef.current = window.setInterval(scanQrCode, 350);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.7777777778 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      const [videoTrack] = mediaStream.getVideoTracks();
      trackRef.current = videoTrack || null;
      if (videoTrack) {
        await improveTrackSettings(videoTrack);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.setAttribute("playsinline", "true");
      }
      startScanning();
    } catch (error) {
      message.error("No se pudo acceder a la camara. Revisa permisos.");
      onClose?.();
    }
  };

  const handleResolvedVariant = (item: ScannedVariantItem, successLabel = "Producto agregado al carrito") => {
    onProductScanned?.(item);
    resetInactivityCountdown();
    showFlash("success", successLabel);
  };

  const openGroupSelector = (group: GroupResolution, payload: string) => {
    pauseScanning();
    setGroupSearch("");
    setGroupSelection(group);
    lastReadRef.current = { payload, ts: Date.now() };
    showFlash("info", "QR de grupo detectado");
  };

  const resolveScannedPayload = async (payload: string, sucursalId?: string) => {
    if (!isGroupPayload(payload)) {
      const variantResponse = await resolveVariantQRPayloadAPI(payload, sucursalId);
      if (variantResponse?.success && variantResponse?.item) {
        return {
          type: "variant" as const,
          item: normalizeVariantItem(variantResponse.item)
        };
      }
    }

    const groupResponse = await resolveVariantQRGroupPayloadAPI(payload, sucursalId);
    if (groupResponse?.success && groupResponse?.group) {
      return {
        type: "group" as const,
        group: groupResponse.group as GroupResolution
      };
    }

    return null;
  };

  const handleProductRequest = async (payload: string) => {
    const now = Date.now();
    if (
      lastReadRef.current.payload === payload &&
      now - lastReadRef.current.ts < 1800
    ) {
      return;
    }
    lastReadRef.current = { payload, ts: now };

    if (isProcessingRef.current || groupSelection) return;
    isProcessingRef.current = true;
    resetInactivityCountdown();

    try {
      const sucursalId = localStorage.getItem("sucursalId") || undefined;
      const resolved = await resolveScannedPayload(payload, sucursalId);

      if (!resolved) {
        showFlash("error", "QR no valido");
        return;
      }

      if (resolved.type === "variant") {
        handleResolvedVariant(resolved.item);
        return;
      }

      openGroupSelector(resolved.group, payload);
    } catch (err) {
      console.error("Error al obtener el producto por QR:", err);
      showFlash("error", "Error leyendo QR");
    } finally {
      isProcessingRef.current = false;
    }
  };

  const scanQrCode = () => {
    if (groupSelection) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.imageSmoothingEnabled = false;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const code = tryDecode(context, canvas.width, canvas.height);

    if (code) {
      void handleProductRequest(code);
    }
  };

  const handleCloseGroupSelection = () => {
    const currentPayload = groupSelection?.qrPayload || "";
    setGroupSelection(null);
    setGroupSearch("");
    if (currentPayload) {
      lastReadRef.current = { payload: currentPayload, ts: Date.now() };
    }
    startScanning();
  };

  const handlePickGroupItem = (item: GroupResolvedItem) => {
    if (item.status !== "available") {
      return;
    }

    const normalized = normalizeVariantItem(item, {
      source: "group_qr",
      groupId: groupSelection?.id,
      groupCode: groupSelection?.groupCode,
      groupName: groupSelection?.name
    });

    setGroupSelection(null);
    setGroupSearch("");
    handleResolvedVariant(normalized, "Variante del grupo agregada");
    startScanning();
  };

  const filteredGroupItems = useMemo(() => {
    const items = groupSelection?.items || [];
    const q = groupSearch.trim().toLowerCase();

    const sorted = [...items].sort((a, b) => {
      const aAvailable = a.status === "available" ? 0 : 1;
      const bAvailable = b.status === "available" ? 0 : 1;
      if (aAvailable !== bAvailable) return aAvailable - bAvailable;
      if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
      if (a.stock !== b.stock) return b.stock - a.stock;
      return a.variantLabel.localeCompare(b.variantLabel);
    });

    if (!q) return sorted;

    return sorted.filter((item) =>
      [item.productName, item.variantLabel, item.variantKey]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [groupSelection, groupSearch]);

  useEffect(() => {
    void startCamera();

    return () => {
      clearScannerIntervals();
      clearFeedbackTimeout();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      resetInactivityCountdown();
      return;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [isScanning]);

  return (
    <>
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          padding: 18,
          background:
            flashState === "success"
              ? "linear-gradient(180deg, #f9fff3 0%, #ffffff 100%)"
              : "linear-gradient(180deg, #fffaf4 0%, #ffffff 100%)",
          borderRadius: 20,
          border:
            flashState === "success" ? "1px solid #d6f0b4" : "1px solid #f1e2cf",
          boxShadow: "0 16px 36px rgba(49, 49, 49, 0.08)",
          margin: "0 auto",
          transition: "all 0.2s ease"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 14,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #ffe8c7 0%, #fff5e6 100%)",
                color: "#b86d17",
                fontSize: 20,
                flexShrink: 0
              }}
            >
              <QrcodeOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Escaner de ventas por QR
              </Title>
              <Text style={{ color: "#8c6b45" }}>
                Lee variantes directas o grupos QR y agrega al carrito sin salir de ventas.
              </Text>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag color={groupSelection ? "processing" : isScanning ? "green" : "default"}>
              {groupSelection ? "Seleccionando grupo" : isScanning ? "Escaneando" : "En pausa"}
            </Tag>
            <Tag color="gold">Auto cierre {secondsLeft}s</Tag>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid #eddcc9",
            background: "#f7efe7"
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: 18, objectFit: "cover", minHeight: 320 }}
            className="camera-view"
          />

          <div
            style={{
              position: "absolute",
              inset: 18,
              border: "2px solid rgba(255,255,255,0.65)",
              borderRadius: 18,
              pointerEvents: "none",
              boxShadow: "inset 0 0 0 1px rgba(184,109,23,0.15)"
            }}
          />

          {isScanning && (
            <div className="scanning-overlay">
              Escaneando... cierre automatico en {secondsLeft}s
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            justifyContent: "center",
            flexWrap: "wrap"
          }}
        >
          <Button onClick={startScanning} type="primary" icon={<ReloadOutlined />}>
            Reiniciar escaner
          </Button>
          <Button onClick={() => closeScanner(false)}>
            Detener escaner
          </Button>
        </div>

        <Alert
          style={{ marginTop: 16, borderRadius: 14 }}
          type={groupSelection ? "info" : "warning"}
          showIcon
          message={groupSelection ? "Grupo QR abierto" : "Consejo de uso"}
          description={
            groupSelection
              ? "El escaner queda en pausa mientras eliges una variante dentro del grupo."
              : "Mantén el QR centrado unos instantes. Si escaneas un grupo, se abrirá un selector para elegir la variante."
          }
        />

        {flashState && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <span
              style={{
                display: "inline-block",
                padding: "7px 14px",
                borderRadius: 999,
                fontWeight: 600,
                background:
                  flashState === "success"
                    ? "#d9f7be"
                    : flashState === "error"
                      ? "#fff1f0"
                      : "#e6f4ff",
                color:
                  flashState === "success"
                    ? "#135200"
                    : flashState === "error"
                      ? "#a8071a"
                      : "#0958d9",
                border:
                  flashState === "success"
                    ? "1px solid #95de64"
                    : flashState === "error"
                      ? "1px solid #ffa39e"
                      : "1px solid #91caff"
              }}
            >
              {flashLabel}
            </span>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <Modal
        open={Boolean(groupSelection)}
        onCancel={handleCloseGroupSelection}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              border: "1px solid #f0d8bd",
              borderRadius: 18,
              background: "linear-gradient(180deg, #fffaf4 0%, #ffffff 100%)",
              padding: 18
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #ffe8c7 0%, #fff5e6 100%)",
                    color: "#b86d17",
                    fontSize: 20
                  }}
                >
                  <InboxOutlined />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {groupSelection?.name || "Grupo QR"}
                  </Title>
                  <Text style={{ color: "#8c6b45" }}>
                    Elige la variante exacta que quieres agregar desde esta caja.
                  </Text>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag color="blue">{groupSelection?.groupCode || "-"}</Tag>
                <Tag color="green">Disponibles {groupSelection?.availableItems || 0}</Tag>
                <Tag color={(groupSelection?.unavailableItems || 0) > 0 ? "gold" : "default"}>
                  No disponibles {groupSelection?.unavailableItems || 0}
                </Tag>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Input
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="Buscar por producto o variante"
                prefix={<SearchOutlined />}
                allowClear
                style={{ borderRadius: 12 }}
              />
            </div>
          </div>

          {groupSelection?.availableItems === 0 && (
            <Alert
              type="warning"
              showIcon
              message="Este grupo no tiene variantes vendibles en la sucursal actual"
              description="Puedes cerrar este selector y seguir escaneando otros QRs."
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: "60vh",
              overflowY: "auto",
              paddingRight: 4
            }}
          >
            {!filteredGroupItems.length ? (
              <div
                style={{
                  border: "1px dashed #eadac8",
                  borderRadius: 18,
                  background: "#fffdfa",
                  padding: 28
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No hay variantes que coincidan con la búsqueda"
                />
              </div>
            ) : (
              filteredGroupItems.map((item) => {
                const statusMeta = getStatusMeta(item.status);
                const disabled = item.status !== "available";

                return (
                  <div
                    key={`${item.productId}-${item.variantKey}`}
                    style={{
                      border: disabled ? "1px solid #f1e4d6" : "1px solid #ead4b8",
                      borderRadius: 18,
                      background: disabled ? "#fffaf5" : "#fffdfa",
                      padding: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      boxShadow: disabled
                        ? "none"
                        : "0 10px 20px rgba(199, 120, 34, 0.06)"
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap"
                        }}
                      >
                        <Text strong style={{ fontSize: 15 }}>
                          {item.productName}
                        </Text>
                        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                      </div>

                      <div style={{ color: "#6f6f6f", marginBottom: 8 }}>
                        {item.variantLabel || item.variantKey}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Tag>{`Bs. ${Number(item.precio || 0).toFixed(2)}`}</Tag>
                        <Tag color={item.stock > 0 ? "green" : "default"}>{`Stock ${item.stock}`}</Tag>
                        {item.message ? <Tag color="orange">{item.message}</Tag> : null}
                      </div>
                    </div>

                    <Button
                      type={disabled ? "default" : "primary"}
                      icon={disabled ? undefined : <CheckCircleOutlined />}
                      disabled={disabled}
                      onClick={() => handlePickGroupItem(item)}
                    >
                      {disabled ? "No disponible" : "Agregar"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <Text style={{ color: "#8c8c8c" }}>
              {filteredGroupItems.length} variante(s) visible(s)
            </Text>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button onClick={handleCloseGroupSelection}>Seguir escaneando</Button>
              <Button icon={<ReloadOutlined />} type="primary" onClick={handleCloseGroupSelection}>
                Cerrar selector
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default QRScanner;
