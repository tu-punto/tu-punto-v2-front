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
  title?: string;
  description?: string;
  successLabel?: string;
  groupSuccessLabel?: string;
  appearance?: "default" | "simple";
  simpleVideoMinHeight?: number;
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
type Point = { x: number; y: number };
type TrackingBox = { leftPct: number; topPct: number; widthPct: number; heightPct: number };
type BarcodeDetectorResult = {
  rawValue?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  cornerPoints?: Point[];
};
type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};
type DecodedFrame = { payload: string; trackingBox: TrackingBox | null };
type ScanRegion = { x: number; y: number; width: number; height: number };

const AUTO_CLOSE_SECONDS = 15;
const DUPLICATE_READ_WINDOW_MS = 1200;
const SCAN_INTERVAL_MS = 90;
const MAX_FALLBACK_SCAN_WIDTH = 1024;
const TRACKING_BOX_STALE_MS = 650;
const TRACKING_REGION_SCALE = 1.9;

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeTrackingBox = (box: TrackingBox): TrackingBox => {
  const leftPct = clamp(box.leftPct, 0, 0.98);
  const topPct = clamp(box.topPct, 0, 0.98);
  const widthPct = clamp(box.widthPct, 0.04, 1 - leftPct);
  const heightPct = clamp(box.heightPct, 0.04, 1 - topPct);
  return { leftPct, topPct, widthPct, heightPct };
};

const buildTrackingBoxFromPoints = (
  points: Point[],
  frameWidth: number,
  frameHeight: number
): TrackingBox | null => {
  if (!points.length || frameWidth <= 0 || frameHeight <= 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return normalizeTrackingBox({
    leftPct: minX / frameWidth,
    topPct: minY / frameHeight,
    widthPct: (maxX - minX) / frameWidth,
    heightPct: (maxY - minY) / frameHeight
  });
};

const buildTrackingBoxFromRect = (
  rect: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): TrackingBox | null => {
  if (frameWidth <= 0 || frameHeight <= 0 || rect.width <= 0 || rect.height <= 0) return null;
  return normalizeTrackingBox({
    leftPct: rect.x / frameWidth,
    topPct: rect.y / frameHeight,
    widthPct: rect.width / frameWidth,
    heightPct: rect.height / frameHeight
  });
};

const smoothTrackingBox = (
  previous: TrackingBox | null,
  next: TrackingBox | null,
  weight = 0.65
) => {
  if (!next) return null;
  if (!previous) return next;
  return normalizeTrackingBox({
    leftPct: previous.leftPct * weight + next.leftPct * (1 - weight),
    topPct: previous.topPct * weight + next.topPct * (1 - weight),
    widthPct: previous.widthPct * weight + next.widthPct * (1 - weight),
    heightPct: previous.heightPct * weight + next.heightPct * (1 - weight)
  });
};

function QRScanner({
  onProductScanned,
  onClose,
  title = "Escaner de ventas por QR",
  description = "Lee variantes directas o grupos QR y agrega al carrito sin salir de ventas.",
  successLabel = "Producto agregado al carrito",
  groupSuccessLabel = "Variante del grupo agregada",
  appearance = "default",
  simpleVideoMinHeight = 280
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const focusIndicatorTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const isDecodingRef = useRef(false);
  const lastScanAttemptRef = useRef(0);
  const lastReadRef = useRef<{ payload: string; ts: number }>({ payload: "", ts: 0 });
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const isScanningRef = useRef(false);
  const groupSelectionRef = useRef<GroupResolution | null>(null);
  const trackingBoxRef = useRef<TrackingBox | null>(null);
  const lastTrackingAtRef = useRef(0);

  const [isScanning, setIsScanning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);
  const [flashState, setFlashState] = useState<FlashState>(null);
  const [flashLabel, setFlashLabel] = useState("");
  const [groupSelection, setGroupSelection] = useState<GroupResolution | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [trackingBox, setTrackingBox] = useState<TrackingBox | null>(null);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const isSimple = appearance === "simple";

  const updateTrackingBox = (nextBox: TrackingBox | null) => {
    if (!nextBox) {
      trackingBoxRef.current = null;
      lastTrackingAtRef.current = 0;
      setTrackingBox(null);
      return;
    }
    const smoothed = smoothTrackingBox(trackingBoxRef.current, nextBox);
    trackingBoxRef.current = smoothed;
    lastTrackingAtRef.current = Date.now();
    setTrackingBox(smoothed);
  };

  const maybeClearTrackingBox = () => {
    if (!trackingBoxRef.current) return;
    if (Date.now() - lastTrackingAtRef.current <= TRACKING_BOX_STALE_MS) return;
    trackingBoxRef.current = null;
    setTrackingBox(null);
  };

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const clearFocusIndicator = () => {
    if (focusIndicatorTimeoutRef.current) {
      window.clearTimeout(focusIndicatorTimeoutRef.current);
      focusIndicatorTimeoutRef.current = null;
    }
    setFocusIndicator(null);
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
    if (scanFrameRef.current) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
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
    isScanningRef.current = false;
    updateTrackingBox(null);
    clearFocusIndicator();
    setIsScanning(false);
    clearScannerIntervals();
  };

  const closeScanner = (notifyTimeout = false) => {
    isScanningRef.current = false;
    groupSelectionRef.current = null;
    updateTrackingBox(null);
    clearFocusIndicator();
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
    if (!isScanningRef.current) return;
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    let remaining = AUTO_CLOSE_SECONDS;
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

    if (
      typeof capabilities.focusDistance?.min === "number" &&
      typeof capabilities.focusDistance?.max === "number"
    ) {
      advanced.focusDistance =
        capabilities.focusDistance.min +
        (capabilities.focusDistance.max - capabilities.focusDistance.min) * 0.15;
    }

    if (typeof capabilities.zoom?.max === "number" && capabilities.zoom.max >= 1.2) {
      advanced.zoom = Math.min(1.35, capabilities.zoom.max);
    }

    if (
      Array.isArray(capabilities.exposureMode) &&
      capabilities.exposureMode.includes("continuous")
    ) {
      advanced.exposureMode = "continuous";
    }

    if (
      Array.isArray(capabilities.whiteBalanceMode) &&
      capabilities.whiteBalanceMode.includes("continuous")
    ) {
      advanced.whiteBalanceMode = "continuous";
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

  const getBarcodeDetector = () => {
    if (barcodeDetectorRef.current) return barcodeDetectorRef.current;

    const detectorCtor = (globalThis as any).BarcodeDetector;
    if (!detectorCtor) return null;

    try {
      barcodeDetectorRef.current = new detectorCtor({
        formats: ["qr_code"]
      }) as BarcodeDetectorInstance;
    } catch (error) {
      console.debug("BarcodeDetector no disponible para QR", error);
      barcodeDetectorRef.current = null;
    }

    return barcodeDetectorRef.current;
  };

  const tryNativeDecode = async (video: HTMLVideoElement) => {
    const detector = getBarcodeDetector();
    if (!detector) return null;

    try {
      const results = await detector.detect(video);
      const match = results.find((item) => item?.rawValue);
      if (!match?.rawValue) return null;
      const trackingFromPoints = Array.isArray(match.cornerPoints)
        ? buildTrackingBoxFromPoints(match.cornerPoints, video.videoWidth, video.videoHeight)
        : null;
      const trackingFromRect = match.boundingBox
        ? buildTrackingBoxFromRect(match.boundingBox, video.videoWidth, video.videoHeight)
        : null;
      return {
        payload: String(match.rawValue),
        trackingBox: trackingFromPoints || trackingFromRect
      } satisfies DecodedFrame;
    } catch (error) {
      console.debug("Fallo lectura nativa QR, usando fallback jsQR", error);
      return null;
    }
  };

  const prepareFallbackFrame = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) => {
    const sourceWidth = Math.max(video.videoWidth || 0, 1);
    const sourceHeight = Math.max(video.videoHeight || 0, 1);
    const targetWidth =
      sourceWidth > MAX_FALLBACK_SCAN_WIDTH ? MAX_FALLBACK_SCAN_WIDTH : sourceWidth;
    const targetHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * targetWidth));

    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    context.imageSmoothingEnabled = false;
    context.drawImage(video, 0, 0, targetWidth, targetHeight);
  };

  const buildTrackedRegion = (box: TrackingBox, width: number, height: number): ScanRegion => {
    const centerX = (box.leftPct + box.widthPct / 2) * width;
    const centerY = (box.topPct + box.heightPct / 2) * height;
    const regionWidth = clamp(Math.round(box.widthPct * width * TRACKING_REGION_SCALE), 160, width);
    const regionHeight = clamp(Math.round(box.heightPct * height * TRACKING_REGION_SCALE), 160, height);
    const x = clamp(Math.round(centerX - regionWidth / 2), 0, Math.max(0, width - regionWidth));
    const y = clamp(Math.round(centerY - regionHeight / 2), 0, Math.max(0, height - regionHeight));
    return { x, y, width: regionWidth, height: regionHeight };
  };

  const getVideoMetrics = () => {
    const video = videoRef.current;
    if (!video) return null;

    const renderWidth = video.clientWidth || 0;
    const renderHeight = video.clientHeight || 0;
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    if (!renderWidth || !renderHeight || !sourceWidth || !sourceHeight) return null;

    const scale = Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight);
    const contentWidth = sourceWidth * scale;
    const contentHeight = sourceHeight * scale;
    const offsetX = (renderWidth - contentWidth) / 2;
    const offsetY = (renderHeight - contentHeight) / 2;

    return { video, renderWidth, renderHeight, sourceWidth, sourceHeight, scale, contentWidth, contentHeight, offsetX, offsetY };
  };

  const showFocusIndicator = (x: number, y: number) => {
    setFocusIndicator({ x, y, active: true });
    if (focusIndicatorTimeoutRef.current) {
      window.clearTimeout(focusIndicatorTimeoutRef.current);
    }
    focusIndicatorTimeoutRef.current = window.setTimeout(() => {
      setFocusIndicator((current) => (current ? { ...current, active: false } : null));
      focusIndicatorTimeoutRef.current = window.setTimeout(() => {
        setFocusIndicator(null);
        focusIndicatorTimeoutRef.current = null;
      }, 260);
    }, 420);
  };

  const handleTapToFocus = async (event: any) => {
    const metrics = getVideoMetrics();
    if (!metrics) return;

    const { video, renderWidth, renderHeight, scale, offsetX, offsetY, sourceWidth, sourceHeight } = metrics;
    const rect = video.getBoundingClientRect();
    const localX = clamp(event.clientX - rect.left, 0, renderWidth);
    const localY = clamp(event.clientY - rect.top, 0, renderHeight);
    const sourceX = clamp((localX - offsetX) / scale, 0, sourceWidth);
    const sourceY = clamp((localY - offsetY) / scale, 0, sourceHeight);
    const xPct = clamp(sourceX / sourceWidth, 0, 1);
    const yPct = clamp(sourceY / sourceHeight, 0, 1);

    showFocusIndicator(localX, localY);
    updateTrackingBox(
      normalizeTrackingBox({
        leftPct: clamp(xPct - 0.12, 0, 0.96),
        topPct: clamp(yPct - 0.12, 0, 0.96),
        widthPct: 0.24,
        heightPct: 0.24
      })
    );

    const track = trackRef.current as
      | (MediaStreamTrack & {
          getCapabilities?: () => Record<string, any>;
          applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
        })
      | null;

    const capabilities = track?.getCapabilities?.();
    if (!track?.applyConstraints || !capabilities) return;

    const advanced: Record<string, any> = {};
    if (capabilities.pointsOfInterest) {
      advanced.pointsOfInterest = [{ x: sourceX, y: sourceY }];
    }
    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("single-shot")) {
      advanced.focusMode = "single-shot";
    } else if (
      Array.isArray(capabilities.focusMode) &&
      capabilities.focusMode.includes("continuous")
    ) {
      advanced.focusMode = "continuous";
    }

    if (!Object.keys(advanced).length) return;

    try {
      await track.applyConstraints({ advanced: [advanced] });

      if (
        advanced.focusMode === "single-shot" &&
        Array.isArray(capabilities.focusMode) &&
        capabilities.focusMode.includes("continuous")
      ) {
        window.setTimeout(() => {
          void track.applyConstraints?.({
            advanced: [{ focusMode: "continuous" }]
          }).catch(() => undefined);
        }, 220);
      }
    } catch (error) {
      console.debug("Tap-to-focus no soportado por este dispositivo", error);
    }
  };

  const readJsQrRegion = (
    context: CanvasRenderingContext2D,
    region: ScanRegion,
    frameWidth: number,
    frameHeight: number
  ): DecodedFrame | null => {
    const frame = context.getImageData(region.x, region.y, region.width, region.height);
    const qrMatch = jsQR(frame.data, frame.width, frame.height, {
      inversionAttempts: "attemptBoth"
    });

    if (!qrMatch?.data) return null;

    const location = qrMatch.location;
    const absolutePoints = location
      ? [
          { x: location.topLeftCorner.x + region.x, y: location.topLeftCorner.y + region.y },
          { x: location.topRightCorner.x + region.x, y: location.topRightCorner.y + region.y },
          { x: location.bottomRightCorner.x + region.x, y: location.bottomRightCorner.y + region.y },
          { x: location.bottomLeftCorner.x + region.x, y: location.bottomLeftCorner.y + region.y }
        ]
      : [];

    return {
      payload: qrMatch.data,
      trackingBox: buildTrackingBoxFromPoints(absolutePoints, frameWidth, frameHeight)
    };
  };

  const tryDecodeWithJsQr = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): DecodedFrame | null => {
    const trackedRegion = trackingBoxRef.current
      ? buildTrackedRegion(trackingBoxRef.current, width, height)
      : null;

    if (trackedRegion) {
      const trackedCode = readJsQrRegion(context, trackedRegion, width, height);
      if (trackedCode) {
        return trackedCode;
      }
    }

    const cropWidth = Math.floor(width * 0.74);
    const cropHeight = Math.floor(height * 0.74);
    const centeredRegion = {
      x: Math.floor((width - cropWidth) / 2),
      y: Math.floor((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight
    };
    const centeredCode = readJsQrRegion(context, centeredRegion, width, height);
    if (centeredCode) {
      return centeredCode;
    }

    return readJsQrRegion(context, { x: 0, y: 0, width, height }, width, height);
  };

  const startScanning = () => {
    isScanningRef.current = true;
    setIsScanning(true);
    setSecondsLeft(AUTO_CLOSE_SECONDS);
    lastScanAttemptRef.current = 0;
  };

  const scheduleNextScanFrame = () => {
    if (!isScanningRef.current || groupSelectionRef.current || scanFrameRef.current !== null) return;
    scanFrameRef.current = window.requestAnimationFrame(() => {
      scanFrameRef.current = null;
      void scanQrCode();
    });
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.7777777778 },
          frameRate: { ideal: 60, max: 60 }
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
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => undefined);
      }
      startScanning();
    } catch (error) {
      message.error("No se pudo acceder a la camara. Revisa permisos.");
      onClose?.();
    }
  };

  const handleResolvedVariant = (item: ScannedVariantItem, label = successLabel) => {
    onProductScanned?.(item);
    resetInactivityCountdown();
    showFlash("success", label);
  };

  const openGroupSelector = (group: GroupResolution, payload: string) => {
    pauseScanning();
    setGroupSearch("");
    groupSelectionRef.current = group;
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
      now - lastReadRef.current.ts < DUPLICATE_READ_WINDOW_MS
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

  const scanQrCode = async () => {
    if (!isScanningRef.current || groupSelectionRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      scheduleNextScanFrame();
      return;
    }

    const now = performance.now();
    if (isDecodingRef.current || now - lastScanAttemptRef.current < SCAN_INTERVAL_MS) {
      maybeClearTrackingBox();
      scheduleNextScanFrame();
      return;
    }
    lastScanAttemptRef.current = now;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      maybeClearTrackingBox();
      scheduleNextScanFrame();
      return;
    }

    isDecodingRef.current = true;

    try {
      const nativeResult = await tryNativeDecode(video);
      if (nativeResult) {
        updateTrackingBox(nativeResult.trackingBox);
        await handleProductRequest(nativeResult.payload);
        return;
      }

      prepareFallbackFrame(video, canvas, context);
      const decoded = tryDecodeWithJsQr(context, canvas.width, canvas.height);

      if (decoded) {
        updateTrackingBox(decoded.trackingBox);
        await handleProductRequest(decoded.payload);
      } else {
        maybeClearTrackingBox();
      }
    } finally {
      isDecodingRef.current = false;
      scheduleNextScanFrame();
    }
  };

  const handleCloseGroupSelection = () => {
    const currentPayload = groupSelection?.qrPayload || "";
    groupSelectionRef.current = null;
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

    groupSelectionRef.current = null;
    setGroupSelection(null);
    setGroupSearch("");
    handleResolvedVariant(normalized, groupSuccessLabel);
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

  const trackingOverlayStyle = useMemo(() => {
    if (!trackingBox || !videoRef.current) return null;

    const video = videoRef.current;
    const renderWidth = video.clientWidth || 0;
    const renderHeight = video.clientHeight || 0;
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    if (!renderWidth || !renderHeight || !sourceWidth || !sourceHeight) return null;

    const scale = Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight);
    const contentWidth = sourceWidth * scale;
    const contentHeight = sourceHeight * scale;
    const offsetX = (renderWidth - contentWidth) / 2;
    const offsetY = (renderHeight - contentHeight) / 2;

    return {
      left: offsetX + trackingBox.leftPct * contentWidth,
      top: offsetY + trackingBox.topPct * contentHeight,
      width: trackingBox.widthPct * contentWidth,
      height: trackingBox.heightPct * contentHeight
    };
  }, [trackingBox]);

  useEffect(() => {
    void startCamera();

    return () => {
      clearScannerIntervals();
      clearFeedbackTimeout();
      clearFocusIndicator();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    isScanningRef.current = isScanning;
    if (isScanning) {
      resetInactivityCountdown();
      scheduleNextScanFrame();
      return;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (scanFrameRef.current) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
  }, [isScanning]);

  useEffect(() => {
    groupSelectionRef.current = groupSelection;
  }, [groupSelection]);

  return (
    <>
      <div
        style={{
          width: "100%",
          maxWidth: isSimple ? "100%" : 760,
          padding: 18,
          background:
            isSimple
              ? "#ffffff"
              : flashState === "success"
                ? "linear-gradient(180deg, #f9fff3 0%, #ffffff 100%)"
                : "linear-gradient(180deg, #fffaf4 0%, #ffffff 100%)",
          borderRadius: isSimple ? 12 : 20,
          border:
            isSimple
              ? "1px solid #e8e8e8"
              : flashState === "success"
                ? "1px solid #d6f0b4"
                : "1px solid #f1e2cf",
          boxShadow: isSimple ? "none" : "0 16px 36px rgba(49, 49, 49, 0.08)",
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
                borderRadius: isSimple ? 12 : 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isSimple ? "#f5f5f5" : "linear-gradient(135deg, #ffe8c7 0%, #fff5e6 100%)",
                color: isSimple ? "#595959" : "#b86d17",
                fontSize: 20,
                flexShrink: 0
              }}
            >
              <QrcodeOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {title}
              </Title>
              <Text style={{ color: isSimple ? "#8c8c8c" : "#8c6b45" }}>
                {description}
              </Text>
            </div>
          </div>

          {isSimple ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {groupSelection ? "Seleccionando grupo" : isScanning ? "Escaneando" : "En pausa"} | cierre{" "}
              {secondsLeft}s
            </Text>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag color={groupSelection ? "processing" : isScanning ? "green" : "default"}>
                {groupSelection ? "Seleccionando grupo" : isScanning ? "Escaneando" : "En pausa"}
              </Tag>
              <Tag color="gold">Auto cierre {secondsLeft}s</Tag>
            </div>
          )}
        </div>

        <div
          style={{
            position: "relative",
            borderRadius: isSimple ? 12 : 18,
            overflow: "hidden",
            border: isSimple ? "1px solid #d9d9d9" : "1px solid #eddcc9",
            background: isSimple ? "#fafafa" : "#f7efe7",
            touchAction: "manipulation",
            cursor: isSimple ? "default" : "crosshair"
          }}
          onPointerDown={(event) => void handleTapToFocus(event)}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              borderRadius: 18,
              objectFit: "cover",
              minHeight: isSimple ? simpleVideoMinHeight : 320
            }}
            className="camera-view"
          />

          <div
            style={{
              position: "absolute",
              inset: 18,
              border: "2px solid rgba(255,255,255,0.65)",
              borderRadius: isSimple ? 12 : 18,
              pointerEvents: "none",
              boxShadow: isSimple ? "none" : "inset 0 0 0 1px rgba(184,109,23,0.15)"
            }}
          />

          {trackingOverlayStyle && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: trackingOverlayStyle.left,
                  top: trackingOverlayStyle.top,
                  width: trackingOverlayStyle.width,
                  height: trackingOverlayStyle.height,
                  border: "2px solid #52c41a",
                  borderRadius: 14,
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.7), 0 0 18px rgba(82, 196, 26, 0.45), inset 0 0 18px rgba(82, 196, 26, 0.12)",
                  background: "rgba(82, 196, 26, 0.06)",
                  pointerEvents: "none",
                  transition: "all 0.09s linear"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -28,
                    left: 0,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(82, 196, 26, 0.92)",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    whiteSpace: "nowrap"
                  }}
                >
                  QR detectado
                </div>
                {[
                  { left: -2, top: -2, borderRight: "none", borderBottom: "none" },
                  { right: -2, top: -2, borderLeft: "none", borderBottom: "none" },
                  { left: -2, bottom: -2, borderRight: "none", borderTop: "none" },
                  { right: -2, bottom: -2, borderLeft: "none", borderTop: "none" }
                ].map((corner, index) => (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      width: 18,
                      height: 18,
                      border: "3px solid #b7eb8f",
                      borderRadius: 5,
                      pointerEvents: "none",
                      ...corner
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: trackingOverlayStyle.left,
                  top: trackingOverlayStyle.top + trackingOverlayStyle.height / 2 - 1,
                  width: trackingOverlayStyle.width,
                  height: 2,
                  background: "linear-gradient(90deg, rgba(82,196,26,0) 0%, rgba(82,196,26,0.95) 50%, rgba(82,196,26,0) 100%)",
                  boxShadow: "0 0 14px rgba(82, 196, 26, 0.6)",
                  pointerEvents: "none",
                  transition: "all 0.09s linear"
                }}
              />
            </>
          )}

          {focusIndicator && (
            <div
              style={{
                position: "absolute",
                left: focusIndicator.x - 26,
                top: focusIndicator.y - 26,
                width: 52,
                height: 52,
                borderRadius: 18,
                border: `2px solid ${focusIndicator.active ? "#ffd666" : "rgba(255, 214, 102, 0)"}`,
                boxShadow: focusIndicator.active
                  ? "0 0 16px rgba(255, 214, 102, 0.55)"
                  : "none",
                background: focusIndicator.active ? "rgba(255, 214, 102, 0.08)" : "transparent",
                pointerEvents: "none",
                transition: "all 0.22s ease"
              }}
            />
          )}

          {isScanning && (
            <div className="scanning-overlay">
              {trackingOverlayStyle
                ? "QR en seguimiento..."
                : `Escaneando... cierre automatico en ${secondsLeft}s`}
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

        {isSimple && (
          <Text
            type="secondary"
            style={{ display: "block", marginTop: 12, textAlign: "center", fontSize: 12 }}
          >
            {groupSelection
              ? "El escaner queda en pausa mientras eliges una variante."
              : "Manten el QR centrado. Si escaneas un grupo, podras elegir la variante."}
          </Text>
        )}

        {!isSimple && <Alert
          style={{ marginTop: 16, borderRadius: 14 }}
          type={groupSelection ? "info" : "warning"}
          showIcon
          message={groupSelection ? "Grupo QR abierto" : "Consejo de uso"}
          description={
            groupSelection
              ? "El escaner queda en pausa mientras eliges una variante dentro del grupo."
              : "Mantén el QR centrado unos instantes. Si escaneas un grupo, se abrirá un selector para elegir la variante."
          }
        />}

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
