import { useState, useEffect, useRef } from 'react';

function FindShipping() {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      // Solicitar acceso a la cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setHasCamera(true);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setHasCamera(false);
    }
  };

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ width: '100%', maxWidth: '400px' }}
      />
      
      {!hasCamera ? (
        <button onClick={startCamera}>Activar Cámara</button>
      ) : (
        <button onClick={stopCamera}>Detener Cámara</button>
      )}
    </div>
  );
}

export default FindShipping;