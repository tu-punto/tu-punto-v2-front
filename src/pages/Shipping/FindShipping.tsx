import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';

import { getShippingQRByIdAPI } from "../../api/qr";
import ShippingInfoModal from "./ShippingInfoModal";
import { Button } from 'antd';

function FindShipping() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanInterval = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [qrResult, setQrResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [pedidoData, setPedidoData] = useState(null);
  const [pedidoError, setPedidoError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
        if (videoDevices.length > 0) {
          await startCamera();
        }
      } catch (error) {
        console.error('Error verificando cámaras:', error);
      }
    };

    checkCamera();
  }, []);

  const startCamera = async () => {
    try {
      // Solicitar acceso a la cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setHasCamera(true);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      alert('No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.');
    }
  };

  const startScanning = () => {

    setIsScanning(true);
    setQrResult('');
    scanInterval.current = setInterval(scanQrCode, 500);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  const scanQrCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.readyState !== 4) return;

    const context = canvas.getContext('2d');

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener imagen para analizar
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Buscar código QR
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    const handlePedidoRequest = async (qrUrl) => {
      setPedidoData(null);
      setPedidoError('');
      try {
        // Extraer el idPedido de la URL
        const match = qrUrl.match(/product\/(.*?)\?/);
        const idPedido = match ? match[1] : null;
        if (!idPedido) {
          setPedidoError('No se pudo extraer el id del pedido del QR');
          return;
        }
        const res = await getShippingQRByIdAPI(idPedido);
        setPedidoData(res);
        setSelectedShipping(res); // o res.data si tu backend responde así
        setModalVisible(true);
      } catch (err) {
        setPedidoError('No se pudo obtener el pedido: ' + (err?.response?.data?.message || err.message));
      }
    };
    if (code) {
      setQrResult(code.data);
      stopScanning();
      handlePedidoRequest(code.data);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
    };
  }, [stream]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center">
      <div className="w-full max-w-md p-4 space-y-4 bg-white rounded-lg shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="camera-view"
        />
        {isScanning && <div className="scanning-overlay">Escaneando...</div>}
        <Button onClick={startScanning} type="primary"
          className="text-mobile-sm xl:text-desktop-sm ">
          Escanear QR
        </Button>

        {qrResult && (
          <div className="result">
            <ShippingInfoModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              shipping={selectedShipping}
              isAdmin={true}
            />
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default FindShipping;