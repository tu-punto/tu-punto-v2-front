import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { Button, Card, Select, message, Typography } from "antd";

import {
  getShippingStatusHistoryAPI,
  resolveShippingQRPayloadAPI,
  transitionShippingStatusByQRAPI
} from "../../api/qr";
import ShippingInfoModal from "./ShippingInfoModal";

const { Text } = Typography;

const STATUS_OPTIONS = ["En Espera", "En camino", "No entregado", "Cancelado", "Entregado"];

function FindShipping() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanInterval = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [qrResult, setQrResult] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("En Espera");
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [transitionLoading, setTransitionLoading] = useState(false);

  const stopScanning = () => {
    setIsScanning(false);
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
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

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accediendo a la cámara:", error);
      message.error("No se pudo acceder a la cámara");
    }
  };

  useEffect(() => {
    void startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
    };
  }, [stream]);

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
      message.error("No se encontró pedido para ese QR");
      return;
    }

    setSelectedShipping(response.shipping);
    setTargetStatus(response.shipping.estado_pedido || "En Espera");
    setModalVisible(true);
    void loadHistory(response.shipping._id);
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

    if (code?.data) {
      stopScanning();
      void handlePayload(code.data);
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setQrResult("");
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
    }
    scanInterval.current = window.setInterval(scanQrCode, 500);
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
        return;
      }

      message.success("Estado actualizado por QR");
      const shippingUpdated = response?.result?.shipping;
      if (shippingUpdated) {
        setSelectedShipping(shippingUpdated);
        setTargetStatus(shippingUpdated.estado_pedido || targetStatus);
        await loadHistory(shippingUpdated._id);
      }
    } finally {
      setTransitionLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center">
      <div className="w-full max-w-md p-4 space-y-4 bg-white rounded-lg shadow-lg">
        <video ref={videoRef} autoPlay playsInline className="camera-view" />
        {isScanning && <div className="scanning-overlay">Escaneando...</div>}

        <div className="flex gap-2">
          <Button onClick={startScanning} type="primary" className="text-mobile-sm xl:text-desktop-sm">
            Escanear QR
          </Button>
          <Button onClick={stopScanning}>Detener</Button>
        </div>

        {selectedShipping && (
          <Card size="small" title={`Pedido ${selectedShipping?._id || ""}`}>
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
                Cambiar Estado por QR
              </Button>
              <Button onClick={() => setModalVisible(true)}>Ver Detalle</Button>
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

        <ShippingInfoModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={() => {
            setModalVisible(false);
          }}
          shipping={selectedShipping}
          sucursals={[]}
          isAdmin={true}
        />

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default FindShipping;
