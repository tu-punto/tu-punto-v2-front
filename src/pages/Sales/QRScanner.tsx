import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button, message } from "antd";
import { resolveVariantQRPayloadAPI } from "../../api/qr";

interface QRScannerProps {
  onProductScanned: (product: any) => void;
  onClose?: () => void;
}

function QRScanner({ onProductScanned, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const lastReadRef = useRef<{ payload: string; ts: number }>({ payload: "", ts: 0 });

  const [isScanning, setIsScanning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [flashState, setFlashState] = useState<"success" | "error" | null>(null);
  const [flashLabel, setFlashLabel] = useState("");

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const showFlash = (type: "success" | "error", label: string) => {
    setFlashState(type);
    setFlashLabel(label);
    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFlashState(null);
      setFlashLabel("");
    }, 2000);
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeScanner = (notifyTimeout = false) => {
    setIsScanning(false);
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
      void handleProductRequest(code.data);
    }
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
      message.error("No se pudo acceder a la camara. Revisa permisos.");
      onClose?.();
    }
  };

  const handleProductRequest = async (payload: string) => {
    const now = Date.now();
    if (
      lastReadRef.current.payload === payload &&
      now - lastReadRef.current.ts < 1200
    ) {
      return;
    }
    lastReadRef.current = { payload, ts: now };

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    resetInactivityCountdown();

    try {
      const sucursalId = localStorage.getItem("sucursalId") || undefined;
      const res = await resolveVariantQRPayloadAPI(payload, sucursalId);
      if (!res?.success || !res?.item) {
        showFlash("error", "QR no valido");
        return;
      }

      onProductScanned?.(res.item);
      resetInactivityCountdown();
      showFlash("success", "Producto agregado al carrito");
    } catch (err) {
      console.error("Error al obtener el producto por QR:", err);
      showFlash("error", "Error leyendo QR");
    } finally {
      isProcessingRef.current = false;
    }
  };

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
    <div
      style={{
        width: "60%",
        padding: 16,
        background: flashState === "success" ? "#f6ffed" : "#fff",
        borderRadius: 8,
        border: flashState === "success" ? "1px solid #b7eb8f" : "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        margin: "0 auto",
        transition: "all 0.2s ease"
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
        className="camera-view"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
        <Button onClick={startScanning} type="primary">
          Reiniciar escaner
        </Button>
        <Button onClick={() => closeScanner(false)}>
          Detener escaner
        </Button>
      </div>
      {isScanning && (
        <div className="scanning-overlay">
          Escaneando... cierre automatico en {secondsLeft}s
        </div>
      )}
      {flashState && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
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
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default QRScanner;
