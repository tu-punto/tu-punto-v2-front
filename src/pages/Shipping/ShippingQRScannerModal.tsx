import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button, Card, Modal, Select, Typography, message } from "antd";
import {
  getShippingStatusHistoryAPI,
  resolveShippingQRPayloadAPI,
  transitionShippingStatusByQRAPI
} from "../../api/qr";
import ShippingInfoModal from "./ShippingInfoModal";

const { Text } = Typography;
const STATUS_OPTIONS = ["En Espera", "En camino", "No entregado", "Cancelado", "Entregado"];

interface Props {
  open: boolean;
  onClose: () => void;
}

const ShippingQRScannerModal = ({ open, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const lastReadRef = useRef<{ payload: string; ts: number }>({ payload: "", ts: 0 });
  const processingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [qrResult, setQrResult] = useState("");
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [targetStatus, setTargetStatus] = useState<string>("En Espera");
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [shippingInfoVisible, setShippingInfoVisible] = useState(false);
  const [flashState, setFlashState] = useState<"success" | "error" | null>(null);
  const [flashLabel, setFlashLabel] = useState("");

  const clearFeedback = () => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFlashState(null);
    setFlashLabel("");
  };

  const showFlash = (type: "success" | "error", label: string) => {
    setFlashState(type);
    setFlashLabel(label);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFlashState(null);
      setFlashLabel("");
    }, 2000);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const clearIntervals = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleStopAndClose = () => {
    setIsScanning(false);
    clearIntervals();
    stopCamera();
    clearFeedback();
    onClose();
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
        message.info("Escaner de pedidos cerrado por inactividad");
        handleStopAndClose();
      }
    }, 1000);
  };

  const loadHistory = async (shippingId: string) => {
    const response = await getShippingStatusHistoryAPI(shippingId);
    if (response?.success) {
      setStatusHistory(response.history || []);
    }
  };

  const handlePayload = async (payload: string) => {
    setQrResult(payload);
    const response = await resolveShippingQRPayloadAPI(payload);

    if (!response?.success || !response?.shipping) {
      showFlash("error", "QR de pedido no valido");
      message.error("No se encontro pedido para ese QR");
      return;
    }

    setSelectedShipping(response.shipping);
    setTargetStatus(response.shipping.estado_pedido || "En Espera");
    await loadHistory(response.shipping._id);
    showFlash("success", "Pedido detectado");
  };

  const scanQrCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code?.data) return;

    const now = Date.now();
    if (
      lastReadRef.current.payload === code.data &&
      now - lastReadRef.current.ts < 1200
    ) {
      return;
    }

    lastReadRef.current = { payload: code.data, ts: now };
    if (processingRef.current) return;
    processingRef.current = true;
    resetInactivityCountdown();
    void handlePayload(code.data).finally(() => {
      processingRef.current = false;
    });
  };

  const startScanning = () => {
    setIsScanning(true);
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
    }
    scanIntervalRef.current = window.setInterval(scanQrCode, 350);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      startScanning();
    } catch (error) {
      message.error("No se pudo abrir la camara");
    }
  };

  const handleTransition = async () => {
    if (!qrResult || !targetStatus) return;
    setTransitionLoading(true);

    try {
      const response = await transitionShippingStatusByQRAPI({
        payload: qrResult,
        toStatus: targetStatus
      });

      if (!response?.success) {
        message.error("No se pudo actualizar el estado");
        showFlash("error", "No se pudo cambiar estado");
        return;
      }

      const shippingUpdated = response?.result?.shipping;
      if (shippingUpdated) {
        setSelectedShipping(shippingUpdated);
        setTargetStatus(shippingUpdated.estado_pedido || targetStatus);
        await loadHistory(shippingUpdated._id);
      }
      showFlash("success", "Estado actualizado");
      message.success("Estado actualizado por QR");
    } finally {
      setTransitionLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setIsScanning(false);
      clearIntervals();
      stopCamera();
      clearFeedback();
      setSelectedShipping(null);
      setStatusHistory([]);
      setQrResult("");
      return;
    }

    void startCamera();

    return () => {
      clearIntervals();
      stopCamera();
      clearFeedback();
    };
  }, [open]);

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
      <Modal
        open={open}
        onCancel={handleStopAndClose}
        footer={null}
        width={760}
        destroyOnClose
        title="Escaner de pedidos por QR"
      >
        <div
          style={{
            background: flashState === "success" ? "#f6ffed" : "#fff",
            border: flashState === "success" ? "1px solid #b7eb8f" : "1px solid #f0f0f0",
            borderRadius: 12,
            padding: 14,
            transition: "all 0.2s ease"
          }}
        >
          <video ref={videoRef} autoPlay playsInline className="camera-view" />
          {isScanning && (
            <div className="scanning-overlay">
              Escaneando... cierre automatico en {secondsLeft}s
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button onClick={startScanning} type="primary">
              Escanear QR
            </Button>
            <Button onClick={handleStopAndClose}>Detener escaner</Button>
          </div>

          {flashState && (
            <div style={{ marginTop: 10 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontWeight: 600,
                  background: flashState === "success" ? "#d9f7be" : "#fff1f0",
                  color: flashState === "success" ? "#135200" : "#a8071a",
                  border: flashState === "success" ? "1px solid #95de64" : "1px solid #ffa39e"
                }}
              >
                {flashLabel}
              </span>
            </div>
          )}

          {selectedShipping && (
            <Card size="small" title={`Pedido ${selectedShipping?._id || ""}`} style={{ marginTop: 12 }}>
              <div className="mb-2">
                <Text strong>Cliente:</Text> <Text>{selectedShipping?.cliente || "-"}</Text>
              </div>
              <div className="mb-2">
                <Text strong>Estado actual:</Text> <Text>{selectedShipping?.estado_pedido || "-"}</Text>
              </div>
              <div className="mb-3">
                <Select
                  className="w-full"
                  value={targetStatus}
                  onChange={setTargetStatus}
                  options={STATUS_OPTIONS.map((status) => ({ label: status, value: status }))}
                />
              </div>
              <div className="flex gap-2">
                <Button type="primary" onClick={handleTransition} loading={transitionLoading}>
                  Cambiar estado por QR
                </Button>
                <Button onClick={() => setShippingInfoVisible(true)}>Ver pedido</Button>
              </div>
              {statusHistory.length > 0 && (
                <div className="mt-3">
                  <Text strong>Historial</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {statusHistory.slice(0, 8).map((item, idx) => (
                      <li key={`${item._id || idx}`}>
                        {item.fromStatus} -&gt; {item.toStatus}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </Modal>

      <ShippingInfoModal
        visible={shippingInfoVisible}
        onClose={() => setShippingInfoVisible(false)}
        onSave={() => setShippingInfoVisible(false)}
        shipping={selectedShipping}
        sucursals={[]}
        isAdmin={true}
      />
    </>
  );
};

export default ShippingQRScannerModal;
