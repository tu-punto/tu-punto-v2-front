import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button, Col } from 'antd';

import { getProductQRByIdAPI } from "../../api/qr";

interface QRScannerProps {
  onProductScanned: (product: any) => void;
}

function QRScanner({ onProductScanned }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanInterval = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        alert('No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.');
      }
    };
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  const startScanning = () => {
    setIsScanning(true);
    if (scanInterval.current) clearInterval(scanInterval.current);
    scanInterval.current = setInterval(scanQrCode, 500);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scanInterval.current) clearInterval(scanInterval.current);
  };

  const restartScanning = () => {
    setTimeout(() => {
      startScanning();
    }, 20000);
  };

  const scanQrCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      stopScanning();
      handleProductRequest(code.data);
    }
  };

  const handleProductRequest = async (qrUrl: string) => {
    try {
      const match = qrUrl.match(/[?&]qr=([^&]+)/);
      const idProducto = match ? match[1] : null;
      if (!idProducto) {
        restartScanning();
        return;
      }
      const res = await getProductQRByIdAPI(idProducto);
      if (onProductScanned && res && res.product) {
        onProductScanned(res.product);
      }
    } catch (err) {
      console.error("Error al obtener el producto por QR:", err);
    } finally {
      restartScanning();
    }
  };

  return (
    <div
      style={{
        width: '60%',
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        margin: '0 auto'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
        className="camera-view"
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        <Button onClick={startScanning} type="primary">
          Escanear QR
        </Button>
        <Button onClick={stopScanning} type="primary">
          Detener Escanear
        </Button>
      </div>
      {isScanning && <div className="scanning-overlay">Escaneando...</div>}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default QRScanner;