import TempProductModal from './TempProductModal';
import { useEffect, useState, useMemo } from 'react';
import {
    Modal, Card, Button, Form, Input, DatePicker, Row, Col, TimePicker,
    Radio, Select, InputNumber, message, Switch
} from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import EmptySalesTable from '../Sales/EmptySalesTable';
import useEditableTable from '../../hooks/useEditableTable';
import { UserOutlined, PhoneOutlined, CommentOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useWatch } from 'antd/es/form/Form';
import EditProductsModal from './EditProductsModal';
import useRawProducts from "../../hooks/useRawProducts.tsx";
import { getSellersBasicAPI } from "../../api/seller.ts";
import { updateShippingAPI } from '../../api/shipping.ts';
import { deleteShippingAPI } from '../../api/shipping';
import { generateShippingLabelQRAPI } from '../../api/qr.ts';
import moment from "moment-timezone";
import { updateProductsByShippingAPI } from "../../api/sales.ts";
import { printShippingTemporaryLabel } from "./shippingQrLabel";

const normalizeDeliveryPayer = (value: unknown): "comprador" | "vendedor" =>
    value === "vendedor" ? "vendedor" : "comprador";

const buildGoogleMapsSearchUrl = (query: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const resolveBranchId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value?._id || value?.id_sucursal || value?.$oid || "");
};

const normalizeBranchName = (value: unknown): string =>
    String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const findBranchByName = (branches: any[], value: unknown) => {
    const normalizedName = normalizeBranchName(value);
    if (!normalizedName) return null;

    return branches.find((branch: any) => normalizeBranchName(branch?.nombre) === normalizedName) || null;
};

const ShippingInfoModal = ({ visible, onClose, shipping, onSave, sucursals = [], isAdmin }: any) => {
    const [internalForm] = Form.useForm();
    const [products, setProducts, handleValueChange] = useEditableTable([]);
    const [originalProducts, setOriginalProducts] = useState<any[]>([]);
    const [deletedProducts, setDeletedProducts] = useState<string[]>([]);
    const [tempModalVisible, setTempModalVisible] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    //const [quienPaga, setQuienPaga] = useState<string | null>(null);
    const [montoDelivery, setMontoDelivery] = useState(0);
    const [costoDelivery, setCostoDelivery] = useState(0);
    //const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const quienPagaDelivery = useWatch("quien_paga_delivery", internalForm);
    const [estadoPedido, setEstadoPedido] = useState<string | null>(null);
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [estadoInicialPedido, setEstadoInicialPedido] = useState<string | null>(null);
    const [isRangeHour, setIsRangeHour] = useState(false);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [showWarning, setShowWarning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [shippingQrData, setShippingQrData] = useState<{
        shippingQrCode?: string;
        shippingQrPayload?: string;
        shippingQrImagePath?: string;
    } | null>(null);
    const { rawProducts: data } = useRawProducts(); const [editProductsModalVisible, setEditProductsModalVisible] = useState(false);
    const adelantoCliente = useWatch('adelanto_cliente', internalForm);
    const [estaPagado, setEstaPagado] = useState<string | null>(null);
    const [confirmDeleteAdelanto, setConfirmDeleteAdelanto] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [clickedOnce, setClickedOnce] = useState(false);
    const cargoDelivery = useWatch('cargo_delivery', internalForm);
    const estadoPedidoForm = useWatch("estado_pedido", internalForm);
    const normalizarTipoPago = (valor: string): string | null => {
        const mapping: Record<string, string> = {
            'transferencia o qr': '1',
            'efectivo': '2',
            'pagado al dueño': '3',
            'efectivo + qr': '4',
            '1': '1',
            '2': '2',
            '3': '3',
            '4': '4',
        };

        const clave = valor.trim().toLowerCase();
        return mapping[clave] || null;
    };

    useEffect(() => {
        if (visible && shipping) {
            const pagoEstado = shipping.esta_pagado || (shipping.adelanto_cliente ? "adelanto" : "no");
            setEstaPagado(pagoEstado);
            setAdelantoVisible(pagoEstado === "adelanto");
        }
    }, [visible, shipping]);

    const tipoDestino = useWatch("tipo_destino", internalForm);
    const destinoSucursalId = useWatch("destino_sucursal_id", internalForm);
    const lugarEntregaInput = useWatch("lugar_entrega_input", internalForm);
    const origenBranchId = useMemo(() => resolveBranchId(shipping?.lugar_origen), [shipping]);
    const legacyDestinationSucursal = useMemo(
        () => findBranchByName(sucursals, shipping?.lugar_entrega),
        [sucursals, shipping?.lugar_entrega]
    );
    const paymentBranchId = useMemo(
        () => {
            const storedPaymentBranchId = resolveBranchId(shipping?.sucursal);
            const legacyDestinationBranchId = resolveBranchId(legacyDestinationSucursal?._id);

            if (shipping?.tipo_destino === "otro_lugar") {
                return storedPaymentBranchId || origenBranchId;
            }

            return (
                (storedPaymentBranchId && storedPaymentBranchId !== origenBranchId ? storedPaymentBranchId : "") ||
                legacyDestinationBranchId ||
                storedPaymentBranchId ||
                origenBranchId
            );
        },
        [shipping, origenBranchId, legacyDestinationSucursal]
    );
    const currentSucursalId = localStorage.getItem("sucursalId") || "";
    const origenSucursal = useMemo(
        () => sucursals.find((s: any) => String(s._id) === String(origenBranchId)),
        [sucursals, origenBranchId]
    );
    const destinoSucursalSeleccionada = useMemo(
        () => {
            const effectiveDestinationBranchId =
                tipoDestino === "esta_sucursal"
                    ? origenBranchId
                    : (destinoSucursalId || paymentBranchId);
            return sucursals.find((s: any) => String(s._id) === String(effectiveDestinationBranchId));
        },
        [sucursals, tipoDestino, origenBranchId, destinoSucursalId, paymentBranchId]
    );
    const origenEsIgualADestino = useMemo(() => {
        if (tipoDestino === "esta_sucursal") return true;
        if (tipoDestino !== "sucursal") return false;
        return String(destinoSucursalId || paymentBranchId) === String(origenBranchId);
    }, [tipoDestino, destinoSucursalId, paymentBranchId, origenBranchId]);
    const requiereConfigDelivery = useMemo(() => {
        if (tipoDestino === "sucursal") {
            return !origenEsIgualADestino;
        }
        return Boolean(tipoDestino === "otro_lugar" && (lugarEntregaInput || "").trim());
    }, [tipoDestino, origenEsIgualADestino, lugarEntregaInput]);
    const mapsPreviewUrl = useMemo(() => {
        const query = String(lugarEntregaInput || "").trim();
        return query ? buildGoogleMapsSearchUrl(query) : "";
    }, [lugarEntregaInput]);
    const deliveryOwnerBranchId = useMemo(() => {
        if (tipoDestino === "sucursal") {
            return String(destinoSucursalId || paymentBranchId || "");
        }
        return origenBranchId || paymentBranchId;
    }, [tipoDestino, destinoSucursalId, paymentBranchId, origenBranchId]);
    const isSimplePackageOrder = Boolean(shipping?.simple_package_order || shipping?.simple_package_source_id);
    const simplePackagePrice = useMemo(() => Number(shipping?.precio_paquete ?? 0), [shipping]);
    const simplePackageSaldo = useMemo(() => Number(shipping?.saldo_por_paquete ?? 0), [shipping]);
    const simplePackageShippingPrice = useMemo(
        () => Number(shipping?.precio_entre_sucursal ?? shipping?.cargo_delivery ?? 0),
        [shipping]
    );
    const simplePackageTotalServicePrice = useMemo(
        () => Number((simplePackagePrice + simplePackageShippingPrice).toFixed(2)),
        [simplePackagePrice, simplePackageShippingPrice]
    );
    const canMarkAsDelivered = useMemo(() => {
        return !deliveryOwnerBranchId || String(deliveryOwnerBranchId) === String(currentSucursalId);
    }, [deliveryOwnerBranchId, currentSucursalId]);


    const saldoACobrar = useMemo(() => {
        if (estaPagado === 'si') return 0;

        const deliveryAdicional = internalForm.getFieldValue("quien_paga_delivery") === "comprador"
            ? (cargoDelivery ?? 0)
            : 0;

        const adelanto = adelantoCliente || 0;
        return parseFloat((totalAmount - adelanto + deliveryAdicional).toFixed(2));
    }, [totalAmount, adelantoCliente, cargoDelivery, quienPagaDelivery, estaPagado]);
    const handleDeleteProduct = (key: any) => {
        setProducts((prev: any) => {
            const toDelete = prev.find((p: any) => p.key === key);
            if (toDelete?.id_venta) setDeletedProducts((prevDels) => [...prevDels, toDelete.id_venta]);
            return prev.filter((p: any) => p.key !== key);
        });
    };
    // useEffect para cargarlos si no lo estás haciendo ya
    useEffect(() => {
        const fetchSellers = async () => {
            const res = await getSellersBasicAPI();
            const sellersList = Array.isArray(res) ? res : [];
            const hoy = new Date().setHours(0, 0, 0, 0);

            const vigentes = sellersList.filter((v: any) => {
                if (!v.fecha_vigencia) return true;
                const fecha = new Date(v.fecha_vigencia).getTime();
                return fecha >= hoy;
            });

            setSellers(vigentes);
        };

        fetchSellers();
    }, []);
    useEffect(() => {
        if ((adelantoCliente ?? 0) < 0) {
            message.warning("El adelanto no puede ser negativo.");
            internalForm.setFieldValue("adelanto_cliente", 0);
        }
    }, [adelantoCliente]);

    useEffect(() => {
        if (tipoPago === '3') {
            internalForm.setFieldValue("adelanto_cliente", 0);
        }
    }, [tipoPago]);

    useEffect(() => {
        if (
            estadoPedidoForm === "Entregado" &&
            estadoInicialPedido !== "Entregado"
        ) {
            const ahora = dayjs().tz("America/La_Paz");
            internalForm.setFieldsValue({
                fecha_entrega: ahora,
                hora_entrega_acordada: ahora,
                hora_entrega_rango_final: ahora
            });
        }
    }, [estadoPedidoForm, estadoInicialPedido]);

    useEffect(() => {
        if (estadoPedidoForm === "Entregado") {
            const paidStatus = internalForm.getFieldValue("esta_pagado");
            if (paidStatus === "si") {
                setTipoPago("3");
                setQrInput(0);
                setEfectivoInput(0);
                internalForm.setFieldsValue({
                    tipo_de_pago: "3",
                    subtotal_qr: 0,
                    subtotal_efectivo: 0,
                });
            }
        }
    }, [estadoPedidoForm, internalForm]);

    const tipoPagoTextoAValor: Record<string, string> = {
        'Transferencia o QR': '1',
        'Efectivo': '2',
        'Pagado al dueño': '3',
        'Efectivo + QR': '4',
    };
    useEffect(() => {
        if (visible && shipping?.tipo_de_pago) {
            const tipo = shipping.tipo_de_pago;

            const tipoPagoId = normalizarTipoPago(tipo);

            setTipoPago(tipoPagoId);
            internalForm.setFieldValue("tipo_de_pago", tipoPagoId);
        }
    }, [visible, shipping?.tipo_de_pago]);

    useEffect(() => {
        if (!visible || !shipping) return;

        internalForm.resetFields();
        //console.log("📦 Valor original hora_entrega_acordada (sin parsear):", shipping.hora_entrega_acordada);

        const originId = resolveBranchId(shipping.lugar_origen);
        const shippingPaymentBranchId = resolveBranchId(shipping.sucursal) || originId;
        const legacyDestinationBranch = findBranchByName(sucursals, shipping.lugar_entrega);
        const legacyDestinationBranchId = resolveBranchId(legacyDestinationBranch?._id);
        const inferredDestinationType =
            shipping.tipo_destino ||
            (((shippingPaymentBranchId && shippingPaymentBranchId !== originId) || legacyDestinationBranchId)
                ? "sucursal"
                : "otro_lugar");
        const inferredDestinationBranchId = inferredDestinationType === "sucursal"
            ? (
                (shippingPaymentBranchId && shippingPaymentBranchId !== originId ? shippingPaymentBranchId : "") ||
                legacyDestinationBranchId ||
                shippingPaymentBranchId ||
                originId
            )
            : undefined;
        const lugar_entrega_input = inferredDestinationType === "otro_lugar" ? shipping.lugar_entrega : '';
        const quienPagaDeVenta = normalizeDeliveryPayer(
            shipping?.venta?.[0]?.quien_paga_delivery ||
            shipping?.quien_paga_delivery
        );
        const rawFecha = shipping.hora_entrega_acordada;
        const originalHoraEntregaUTC = rawFecha ? dayjs.utc(rawFecha) : null;

        const fechaRango = shipping.hora_entrega_rango_final
        const originalHoraRangoUTC = fechaRango ? dayjs.utc(fechaRango) : null;

        setIsRangeHour(shipping.hora_entrega_rango_final)

        //console.log("🟢 UTC:", dayjs.utc(shipping.hora_entrega_acordada).format());
        //console.log("🟡 Local:", dayjs.utc(shipping.hora_entrega_acordada).local().format());

        const formDestinationType =
            inferredDestinationType === "sucursal" && String(inferredDestinationBranchId || "") === String(originId || "")
                ? "esta_sucursal"
                : inferredDestinationType;

        internalForm.setFieldsValue({
            cliente: shipping.cliente,
            telefono_cliente: shipping.telefono_cliente,
            tipo_destino: formDestinationType,
            destino_sucursal_id: inferredDestinationType === "sucursal" ? inferredDestinationBranchId : undefined,
            lugar_entrega_input,
            ubicacion_link: shipping.ubicacion_link || "",
            fecha_entrega: originalHoraEntregaUTC ? dayjs(originalHoraEntregaUTC.format("YYYY-MM-DD"), "YYYY-MM-DD") : null,
            hora_entrega_acordada: originalHoraEntregaUTC
                ? dayjs(originalHoraEntregaUTC.format("HH:mm:ss"), "HH:mm:ss")
                : null,
            hora_entrega_rango_final: originalHoraRangoUTC
                ? dayjs(originalHoraRangoUTC.format("HH:mm:ss"), "HH:mm:ss")
                : null,
            observaciones: shipping.observaciones,
            estado_pedido: shipping.estado_pedido,
            quien_paga_delivery: quienPagaDeVenta,
            cargo_delivery: shipping.cargo_delivery,
            costo_delivery: shipping.costo_delivery,
            adelanto_cliente: shipping.adelanto_cliente,
            tipo_de_pago: normalizarTipoPago(shipping.tipo_de_pago || '') || null,
            subtotal_qr: shipping.subtotal_qr || 0,
            subtotal_efectivo: shipping.subtotal_efectivo || 0,
            esta_pagado: shipping.esta_pagado || (shipping.adelanto_cliente ? "adelanto" : "no"),
        });

        setEstadoPedido(shipping.estado_pedido || "En Espera");
        setEstadoInicialPedido(shipping.estado_pedido || "En Espera");
        if (inferredDestinationType !== "sucursal" || inferredDestinationBranchId !== originId) {
            internalForm.setFieldValue('quien_paga_delivery', 'comprador');
        }
        const ventasNormales = (shipping.venta || []).map((p: any) => ({
            ...p,
            id_venta: p._id ?? null,
            key: p._id || `${p.id_producto}-${Object.values(p.variantes || {}).join("-") || "default"}`,
            esTemporal: p?.producto?.esTemporal || false, // ✅ nuevo
            producto: p.nombre_variante || p.nombre_producto || p.producto || "Sin nombre"
        }));

        const shouldRenderTemporaryProducts = ventasNormales.length === 0;

        const productosTemporales = (!shouldRenderTemporaryProducts ? [] : (shipping.productos_temporales || [])).map((item: any, index: number) => ({
            ...item,
            id_venta: null,
            key: `temp-${shipping._id || "pedido"}-${index}`,
            esTemporal: true,
            producto: item?.nombre_producto || item?.producto || item?.nombre_variante || "Producto temporal",
            nombre_variante: item?.nombre_variante || item?.nombre_producto || item?.producto || "Producto temporal",
            cantidad: Number(item?.cantidad || 1),
            precio_unitario: Number(item?.precio_unitario || 0),
            utilidad: Number(item?.utilidad || 0),
        }));

        const mergedProducts = [...ventasNormales, ...productosTemporales];

        setProducts(mergedProducts);
        setOriginalProducts(JSON.parse(JSON.stringify(mergedProducts)));

    }, [visible, shipping, sucursals]);

    useEffect(() => {
        if (!visible || !shipping?._id) {
            setShippingQrData(null);
            return;
        }

        setShippingQrData({
            shippingQrCode: shipping?.shipping_qr_code,
            shippingQrPayload: shipping?.shipping_qr_payload,
            shippingQrImagePath: shipping?.shipping_qr_image_path
        });
    }, [visible, shipping]);

    useEffect(() => {
        const monto = saldoACobrar || 0;
        const suma = (qrInput || 0) + (efectivoInput || 0);
        if (tipoPago === '4') {
            setShowWarning(suma !== monto);
        } else {
            setShowWarning(false);
        }
    }, [qrInput, efectivoInput, tipoPago, saldoACobrar]);

    useEffect(() => {
        if (tipoPago === '1') {
            internalForm.setFieldsValue({ subtotal_qr: saldoACobrar });
            setQrInput(saldoACobrar);
            setEfectivoInput(0);
        } else if (tipoPago === '2' || tipoPago === '3') {
            internalForm.setFieldsValue({ subtotal_efectivo: saldoACobrar });
            setQrInput(0);
            setEfectivoInput(saldoACobrar);
        } else if (tipoPago === '4') {
            const mitad = parseFloat((saldoACobrar / 2).toFixed(2));
            internalForm.setFieldsValue({
                subtotal_qr: mitad,
                subtotal_efectivo: saldoACobrar - mitad
            });
            setQrInput(mitad);
            setEfectivoInput(saldoACobrar - mitad);
        }
    }, [tipoPago, saldoACobrar, internalForm]);
    useEffect(() => {
        const recalculated = products.reduce((acc: number, p: any) => {
            return acc + (p.precio_unitario * p.cantidad);
        }, 0);
        setTotalAmount(parseFloat(recalculated.toFixed(2)));
    }, [products]);
    const enrichedProducts = useMemo(() => {
        const sucursalId = origenBranchId || localStorage.getItem("sucursalId");
        if (!data) return [];

        return data.flatMap((p: any) => {
            const sucursal = p.sucursales?.find((s: any) => String(s.id_sucursal) === String(sucursalId));
            if (!sucursal) return [];

            return sucursal.combinaciones.map((combo: any, index: number) => {
                const varianteNombre = Object.values(combo.variantes || {}).join(" / ");
                return {
                    ...p,
                    key: `${p._id}-${index}`,
                    producto: `${p.nombre_producto} - ${varianteNombre}`,
                    nombre_variante: `${p.nombre_producto} - ${varianteNombre}`,
                    precio: combo.precio,
                    stockActual: combo.stock,
                    variantes: combo.variantes,
                    sucursalId,
                };
            });
        });
    }, [data, origenBranchId]);
    const temporaryLabelItems = useMemo(() => {
        const shouldUseShippingTemporaryLabels =
            !(isSimplePackageOrder && (products || []).some((item: any) => Boolean(item?.esTemporal || item?.producto?.esTemporal)));

        const fromShipping = (!shouldUseShippingTemporaryLabels ? [] : (shipping?.productos_temporales || [])).map((item: any, index: number) => ({
            key: `temp-${index}-${item?.nombre_producto || item?.producto || "item"}`,
            name: String(item?.nombre_producto || item?.producto || item?.nombre_variante || "Producto temporal"),
            quantity: Number(item?.cantidad || 1)
        }));

        const fromSales = (products || [])
            .filter((item: any) => Boolean(item?.esTemporal || item?.producto?.esTemporal))
            .map((item: any, index: number) => ({
                key: `sale-temp-${index}-${item?.producto || item?.nombre_variante || "item"}`,
                name: String(item?.nombre_variante || item?.producto || "Producto temporal"),
                quantity: Number(item?.cantidad || 1)
            }));

        const merged = new Map<string, { key: string; name: string; quantity: number }>();
        [...fromShipping, ...fromSales].forEach((item) => {
            const current = merged.get(item.name);
            if (current) {
                current.quantity += item.quantity;
                return;
            }
            merged.set(item.name, { ...item });
        });

        return Array.from(merged.values());
    }, [products, shipping]);

    const ensureShippingQrData = async () => {
        const cachedQrPath = shippingQrData?.shippingQrImagePath || shipping?.shipping_qr_image_path;
        if (cachedQrPath) {
            return {
                shippingQrCode: shippingQrData?.shippingQrCode || shipping?.shipping_qr_code,
                shippingQrPayload: shippingQrData?.shippingQrPayload || shipping?.shipping_qr_payload,
                shippingQrImagePath: cachedQrPath
            };
        }

        const response = await generateShippingLabelQRAPI(shipping._id);
        const qrData = response?.qrData;
        if (!response?.success || !qrData?.shippingQrImagePath) {
            return null;
        }

        setShippingQrData(qrData);
        return qrData;
    };

    const handleGenerateShippingQR = async () => {
        if (!shipping?._id) return;
        setQrLoading(true);
        try {
            const qrData = await ensureShippingQrData();
            const qrPath = qrData?.shippingQrImagePath;
            if (!qrPath) {
                message.error("No se pudo generar QR de entrega");
                return;
            }
            window.open(qrPath, "_blank");
            message.success("QR de entrega generado");
        } catch (error) {
            console.error(error);
            message.error("Error generando QR de entrega");
        } finally {
            setQrLoading(false);
        }
    };
    const handleCancelChanges = () => {
        internalForm.resetFields();
        setProducts(originalProducts);
        onClose();
    };
    const handleSave = async (values: any) => {
        setLoading(true);
        const newProducts = products.filter((p: any) => !p.id_venta);
        const existingProducts = products.filter((p: any) => p.id_venta);
        const stockBranchId = origenBranchId || localStorage.getItem('sucursalId');

        const formattedNewProducts = newProducts
            .filter((p: any) => p.id_producto?.length === 24) // ✅ incluye temporales ya registrados
            .map((p: any) => ({
                cantidad: p.cantidad,
                precio_unitario: p.precio_unitario,
                utilidad: p.utilidad,
                id_producto: p.id_producto,
                id_pedido: shipping._id,
                id_vendedor: p.id_vendedor,
                sucursal: stockBranchId,
                deposito_realizado: false,
                nombre_variante: p.nombre_variante || p.producto,
            }));

        try {
            if (saldoACobrar < 0) {
                message.error("El saldo a cobrar no puede ser negativo.");
                setLoading(false);
                return;
            }
            const quienPagaActual = normalizeDeliveryPayer(internalForm.getFieldValue("quien_paga_delivery"));
            const updatedExisting = existingProducts.map((p: any) => ({
                _id: p.id_venta,
                quien_paga_delivery: quienPagaActual,
            }));
            //console.log("Updated existing products:", updatedExisting);
            if (updatedExisting.length > 0) {
                await updateProductsByShippingAPI(shipping._id, updatedExisting);
            }
            //if (formattedNewProducts.length > 0) await registerSalesAPI(formattedNewProducts);
            //if (existingProducts.length > 0) await updateProductsByShippingAPI(shipping._id, existingProducts);
            //if (deletedProducts.length > 0) await deleteProductsByShippingAPI(shipping._id, deletedProducts);
            const fechaEntrega = values.fecha_entrega
                ? moment(values.fecha_entrega.format("YYYY-MM-DD"), "YYYY-MM-DD")
                : moment();

            const horaAcordada = values.hora_entrega_acordada && dayjs.isDayjs(values.hora_entrega_acordada)
                ? values.hora_entrega_acordada.format("HH:mm:ss")
                : moment().format("HH:mm:ss");

            const fechaHoraEntregaAcordada = `${fechaEntrega.format("YYYY-MM-DD")} ${horaAcordada}`;

            const horaRango = values.hora_entrega_rango_final && dayjs.isDayjs(values.hora_entrega_rango_final)
                ? values.hora_entrega_rango_final.format("HH:mm:ss")
                : moment().format("HH:mm:ss");

            const horaEntregaRangoFinal = `${fechaEntrega.format("YYYY-MM-DD")} ${horaRango}`;
            const effectivePaidStatus = values.esta_pagado;
            const effectivePaymentType =
                values.estado_pedido === "Entregado" && values.esta_pagado === "si"
                    ? "3"
                    : values.tipo_de_pago;
            const effectiveAdvance = effectivePaidStatus === "adelanto" ? (values.adelanto_cliente || 0) : 0;
            const effectiveDestinationType = values.tipo_destino === "otro_lugar" ? "otro_lugar" : "sucursal";
            const effectiveDestinationBranchId =
                values.tipo_destino === "esta_sucursal" ? origenBranchId : values.destino_sucursal_id;
            const destinationBranch = sucursals.find((s: any) => String(s._id) === String(effectiveDestinationBranchId));
            const lugarEntregaFinal = effectiveDestinationType === "sucursal"
                ? destinationBranch?.nombre || origenSucursal?.nombre || shipping?.lugar_entrega
                : String(values.lugar_entrega_input || "").trim();
            const ubicacionLinkFinal = String(values.ubicacion_link || "").trim() ||
                (effectiveDestinationType === "otro_lugar" && lugarEntregaFinal
                    ? buildGoogleMapsSearchUrl(lugarEntregaFinal)
                    : "");
            const paymentBranchIdForUpdate = effectiveDestinationType === "sucursal" && effectiveDestinationBranchId
                ? effectiveDestinationBranchId
                : origenBranchId;

            let horaEntregaReal = values.estado_pedido === "Entregado"
                ? moment().tz("America/La_Paz").format("YYYY-MM-DD HH:mm:ss")
                : fechaHoraEntregaAcordada;

            //console.log("🕒 Hora de entrega acordada:", fechaHoraEntregaAcordada);
            const updateShippingInfo: any = {
                ...values,
                tipo_destino: effectiveDestinationType,
                sucursal: paymentBranchIdForUpdate,
                lugar_entrega: lugarEntregaFinal,
                ubicacion_link: ubicacionLinkFinal,
                //fecha_pedido: moment(values.fecha_pedido).tz("America/La_Paz").format('YYYY-MM-DD HH:mm:ss'),
                hora_entrega_acordada: fechaHoraEntregaAcordada,
                pagado_al_vendedor: effectivePaymentType === '3',
                hora_entrega_rango_final: horaEntregaRangoFinal,
                esta_pagado: effectivePaidStatus,
                adelanto_cliente: effectiveAdvance,
                tipo_de_pago: effectivePaymentType,
                quien_paga_delivery: normalizeDeliveryPayer(values.quien_paga_delivery),
            };

            // Forzar subtotales según el tipo de pago
            switch (effectivePaymentType) {
                case '1':
                    updateShippingInfo.subtotal_qr = saldoACobrar;
                    updateShippingInfo.subtotal_efectivo = 0;
                    break;
                case '2':
                    updateShippingInfo.subtotal_qr = 0;
                    updateShippingInfo.subtotal_efectivo = saldoACobrar;
                    break;
                case '3':
                    updateShippingInfo.subtotal_qr = 0;
                    updateShippingInfo.subtotal_efectivo = 0;
                    break;
                case '4':
                    if (isSimplePackageOrder) {
                        const mitad = parseFloat((saldoACobrar / 2).toFixed(2));
                        updateShippingInfo.subtotal_qr = mitad;
                        updateShippingInfo.subtotal_efectivo = parseFloat((saldoACobrar - mitad).toFixed(2));
                    } else {
                        updateShippingInfo.subtotal_qr = qrInput;
                        updateShippingInfo.subtotal_efectivo = efectivoInput;
                    }
                    break;
            }

            console.log("📤 Datos enviados al backend:", updateShippingInfo);

            await updateShippingAPI(updateShippingInfo, shipping._id);
            message.success("Pedido actualizado con éxito");
            onSave();
            onClose();
        } catch (error) {
            console.error("❌ Error al guardar cambios:", error);
            message.error("Ocurrió un error al guardar los cambios");
        } finally {
            setLoading(false);
        }
    };

    const handleChatClient = () => {
        const phoneNumber = shipping.telefono_cliente;

        const shippingDate = new Date(shipping.hora_entrega_real);
        if (("" + shipping.hora_entrega_real).endsWith("Z")) {
            shippingDate.setTime(shippingDate.getTime() + 4 * 60 * 60 * 1000);
        }

        const fixedMinutes = shippingDate.getMinutes() < 10 ? `0${shippingDate.getMinutes()}` : shippingDate.getMinutes();
        const contentMsg: string = `Hola! Te escribimos de Tu Punto\nTenemos una entrega para ti a las ${shippingDate.getHours()}:${fixedMinutes}, queríamos confirmar que estará a esa hora`;
        const encodedMsg = encodeURIComponent(contentMsg);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMsg}`;

        window.open(whatsappUrl, '_blank');
    }

    //console.log("📦 enrichedProducts:", enrichedProducts);
    const handleSendShippingQRToWhatsApp = async () => {
        const phoneNumber = String(shipping?.telefono_cliente || "").replace(/\D/g, "");
        if (!phoneNumber) {
            message.warning("Este pedido no tiene un numero de WhatsApp valido.");
            return;
        }

        setQrLoading(true);
        try {
            const qrData = await ensureShippingQrData();
            if (!qrData?.shippingQrImagePath) {
                message.error("No se pudo obtener el QR del pedido.");
                return;
            }

            const deliveryDate = shipping?.hora_entrega_acordada
                ? moment(shipping.hora_entrega_acordada).format("DD/MM/YYYY HH:mm")
                : "";
            const messageText = [
                `Hola ${shipping?.cliente || ""}, te compartimos el QR de tu pedido ${shipping?._id || ""}.`,
                deliveryDate ? `Entrega prevista: ${deliveryDate}.` : "",
                `QR: ${qrData.shippingQrImagePath}`
            ]
                .filter(Boolean)
                .join("\n");

            window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageText)}`, "_blank");
        } catch (error) {
            console.error("Error enviando QR por WhatsApp:", error);
            message.error("No se pudo preparar el envio por WhatsApp.");
        } finally {
            setQrLoading(false);
        }
    };

    const handlePrintTemporaryLabel = async () => {
        if (!temporaryLabelItems.length) {
            message.info("Este pedido no tiene productos temporales para etiquetar.");
            return;
        }

        setQrLoading(true);
        try {
            const qrData = await ensureShippingQrData();
            printShippingTemporaryLabel({
                shippingId: String(shipping?._id || ""),
                clientName: shipping?.cliente,
                clientPhone: shipping?.telefono_cliente,
                destination: shipping?.lugar_entrega,
                qrImagePath: qrData?.shippingQrImagePath,
                items: temporaryLabelItems.map((item) => ({
                    name: item.name,
                    quantity: item.quantity
                }))
            });
        } catch (error) {
            console.error("Error imprimiendo etiqueta temporal:", error);
            message.error("No se pudo generar la etiqueta temporal.");
        } finally {
            setQrLoading(false);
        }
    };

    const id_shipping = shipping?._id || '';
    return (
        <Modal
            title={`Detalles del Pedido ${shipping?._id || ''}`}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            closable={false}
        >
            {isAdmin && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                    <Button
                        danger
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            Modal.confirm({
                                title: "¿Desea eliminar esta entrega?",
                                content: "Esta acción no se puede deshacer.",
                                okText: "Sí, eliminar",
                                okType: "danger",
                                cancelText: "Cancelar",
                                onOk: async () => {
                                    try {
                                        // Restaurar stock antes de eliminar
                                        //console.log("Restaurando stock de productos antes de eliminar la entrega...",products);

                                        const response = await deleteShippingAPI(shipping._id);
                                        if (response.success) {
                                            message.success("Entrega eliminada correctamente");
                                            onSave();
                                            onClose();
                                        } else {
                                            message.error("No se pudo eliminar la entrega");
                                        }
                                    } catch (err) {
                                        message.error("Error al eliminar la entrega");
                                        console.error("❌ Error en eliminación:", err);
                                    }
                                }
                            });
                        }}
                    />
                </div>
            )}
            {shipping?._id && (
                <div
                    style={{
                        marginBottom: 12,
                        marginTop: 6,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexWrap: "wrap"
                    }}
                >
                    <Button icon={<QrcodeOutlined />} onClick={handleGenerateShippingQR} loading={qrLoading}>
                        Ver QR de entrega
                    </Button>
                    <Button
                        icon={<CommentOutlined />}
                        onClick={() => void handleSendShippingQRToWhatsApp()}
                        loading={qrLoading}
                        disabled={!shipping?.telefono_cliente}
                    >
                        Enviar QR por WhatsApp
                    </Button>
                    <Button
                        icon={<PrinterOutlined />}
                        onClick={() => void handlePrintTemporaryLabel()}
                        loading={qrLoading}
                        disabled={!temporaryLabelItems.length}
                    >
                        Etiqueta temporales
                    </Button>
                </div>
            )}
            <Form
                form={internalForm}
                layout="vertical"
                onFinish={handleSave}
                disabled={!isAdmin}
            >
                {/* INFORMACIÓN DEL CLIENTE */}
                <Card title="Información del Cliente" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="cliente" label="Nombre Cliente" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="telefono_cliente" label="Celular" >
                                <Input
                                    prefix={<PhoneOutlined />}
                                    onKeyDown={(e) => {
                                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Button type="primary" onClick={handleChatClient} disabled={!shipping || !shipping.telefono_cliente}>
                                Contactar
                            </Button>
                        </Col>
                    </Row>
                </Card>
                {isSimplePackageOrder && (
                    <Card title="Detalle del Servicio" bordered={false} style={{ marginTop: 16 }}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label="Precio del paquete">
                                    <Input value={`Bs. ${simplePackagePrice.toFixed(2)}`} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Precio del envio">
                                    <Input value={`Bs. ${simplePackageShippingPrice.toFixed(2)}`} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Precio total del servicio">
                                    <Input value={`Bs. ${simplePackageTotalServicePrice.toFixed(2)}`} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item label="Saldo del paquete">
                                    <Input value={`Bs. ${simplePackageSaldo.toFixed(2)}`} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>
                )}
                {/* DATOS DEL PEDIDO */}
                {!isSimplePackageOrder && (
                <Card title="Datos del Pedido" bordered={false} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='fecha_entrega' label='Fecha de la Entrega' rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        {shipping?.estado_pedido !== "Entregado" && (
                            <div style={{ margin:8 }}>
                            <span style={{ marginRight:8 }}>
                                - ¿Acordar entrega en un rango de horas?
                            </span>
                            <Switch
                                checked={isRangeHour}
                                disabled={shipping?.estado_pedido === "Entregado"}
                                onChange={(checked) => { setIsRangeHour(checked); }}
                                unCheckedChildren="Hora específica"
                                checkedChildren="Rango de horas"
                            />
                        </div>
                        )}
                        <Col span={12}>
                            <Form.Item 
                                name="hora_entrega_acordada" 
                                label={
                                    isRangeHour && shipping?.estado_pedido !== "Entregado" 
                                    ? "Inicio del Rango Horario"
                                    : "Hora de Entrega"}
                            >
                                <TimePicker format='HH:mm' style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        {isRangeHour && shipping?.estado_pedido !== "Entregado" && (
                            <Col span={12}>
                                <Form.Item name="hora_entrega_rango_final" label="Fin del Rango Horario">
                                    <TimePicker format='HH:mm' style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="tipo_destino"
                                label="Destino de la entrega"
                                rules={[{ required: true }]}
                            >
                                <Radio.Group
                                    disabled={!isAdmin}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        if (nextType === "otro_lugar") {
                                            internalForm.setFieldsValue({
                                                destino_sucursal_id: undefined
                                            });
                                        } else if (nextType === "esta_sucursal") {
                                            internalForm.setFieldsValue({
                                                destino_sucursal_id: origenBranchId,
                                                lugar_entrega_input: undefined,
                                                ubicacion_link: undefined
                                            });
                                        } else {
                                            internalForm.setFieldsValue({
                                                lugar_entrega_input: undefined,
                                                ubicacion_link: undefined
                                            });
                                        }
                                    }}
                                >
                                    <Radio.Button value="esta_sucursal">Esta sucursal</Radio.Button>
                                    <Radio.Button value="otro_lugar">Otro lugar</Radio.Button>
                                    <Radio.Button value="sucursal">Otra sucursal</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {tipoDestino === "sucursal" ? (
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="destino_sucursal_id"
                                    label="Sucursal destino"
                                    rules={[{ required: true, message: "Selecciona la sucursal destino" }]}
                                >
                                    <Select
                                        disabled={!isAdmin}
                                        placeholder="Seleccione la sucursal destino"
                                        allowClear
                                        style={{ width: '100%' }}
                                        options={sucursals
                                            .filter((s: any) => String(s._id) !== String(origenBranchId))
                                            .map((s: any) => ({
                                                value: s._id,
                                                label: s.nombre,
                                            }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    ) : tipoDestino === "otro_lugar" ? (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="lugar_entrega_input"
                                        label="Dirección o referencia de entrega"
                                        rules={[{ required: true, message: "Escribe la dirección o referencia" }]}
                                    >
                                        <Input placeholder="Ej. Avenida, barrio, referencia exacta" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={18}>
                                    <Form.Item name="ubicacion_link" label="Link de ubicación">
                                        <Input placeholder="Pega aquí el link de Google Maps o Waze" />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Button
                                        disabled={!mapsPreviewUrl}
                                        style={{ marginTop: 30, width: "100%" }}
                                        onClick={() => {
                                            if (!mapsPreviewUrl) return;
                                            window.open(mapsPreviewUrl, "_blank", "noopener,noreferrer");
                                        }}
                                    >
                                        Abrir Maps
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <Row gutter={16}>
                            <Col span={24}>
                                <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 12 }}>
                                    El pedido queda asignado a <strong>{origenSucursal?.nombre || "esta sucursal"}</strong>.
                                </div>
                            </Col>
                        </Row>
                    )}
                    {(tipoDestino === "sucursal" || tipoDestino === "esta_sucursal") && destinoSucursalSeleccionada && (
                        <Row gutter={16}>
                            <Col span={24}>
                                <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 12 }}>
                                    El stock se descontará de <strong>{origenSucursal?.nombre || "la sucursal origen"}</strong> y el cobro quedará en <strong>{destinoSucursalSeleccionada.nombre}</strong>.
                                </div>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="observaciones" label="Observaciones">
                                <Input prefix={<CommentOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                )}
                {/* PRODUCTOS */}
                <Card title="Productos del Pedido" bordered={false} style={{ marginTop: 16 }}
                    extra={
                        isAdmin && (
                            <Button
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setOriginalProducts(JSON.parse(JSON.stringify(products))); // ⚠️ deep clone, para evitar que se compartan referencias
                                    setEditProductsModalVisible(true);
                                }}
                                type="link"
                            >
                                Editar Productos
                            </Button>
                        )
                    }
                >
                    <EmptySalesTable
                        products={products}
                        onDeleteProduct={isAdmin ? handleDeleteProduct : undefined}
                        onUpdateTotalAmount={setTotalAmount}
                        handleValueChange={handleValueChange}
                        sellers={[]}
                        isAdmin={isAdmin}
                        readonly={true}
                    />
                </Card>

                <TempProductModal
                    visible={tempModalVisible}
                    onCancel={() => setTempModalVisible(false)}
                    onAddProduct={(tempProduct: any) => setProducts((prev: any) => [...prev, tempProduct])}
                />
                {/* DETALLES DEL PAGO */}
                <Card
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Detalles del Pago</span>
                            <span style={{ fontWeight: 'bold' }}>Monto total: Bs. {totalAmount.toFixed(2)}</span>
                        </div>
                    }
                    bordered={false}
                    style={{ marginTop: 16 }}
                >
                    {/* ¿Está ya pagado? */}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="esta_pagado" label="¿Está ya pagado?" rules={[{ required: true }]}>
                                <Radio.Group
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setEstaPagado(value);
                                        setAdelantoVisible(value === 'adelanto');

                                        if (value !== 'adelanto') {
                                            internalForm.setFieldsValue({ adelanto_cliente: 0 }); // << OBLIGATORIO para el form
                                        }

                                        if (value === 'si') {
                                            setTipoPago("3");
                                            internalForm.setFieldValue("tipo_de_pago", "3");
                                        }
                                    }}
                                >
                                    <Radio.Button value="si">Sí</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                    <Radio.Button value="adelanto">Pago Adelanto</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>

                    {adelantoVisible && (
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item name="adelanto_cliente" label="Monto del adelanto" rules={[{ required: true }]}>
                                    <InputNumber
                                        prefix="Bs."
                                        min={0}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {/* Estado del Pedido */}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="estado_pedido" label="Estado del Pedido" rules={[{ required: true }]}>
                                <Radio.Group onChange={(e) => setEstadoPedido(e.target.value.toString())} value={estadoPedido || "En Espera"}>
                                    <Radio.Button value="En Espera">En espera</Radio.Button>
                                    <Radio.Button value="Entregado" disabled={!canMarkAsDelivered}>Entregado</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                            {!canMarkAsDelivered && (
                                <div style={{ marginTop: -8, marginBottom: 8, color: "#b45309", fontSize: 12 }}>
                                    Solo la sucursal destino puede marcar este pedido como entregado.
                                </div>
                            )}
                        </Col>
                    </Row>

                    {/* ¿Quién paga el delivery? */}
                    {requiereConfigDelivery && (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="quien_paga_delivery"
                                        label="¿Quién paga el delivery?"
                                        rules={[{ required: true, message: "Seleccione quién paga el delivery" }]}
                                    >
                                        <Radio.Group
                                            value={quienPagaDelivery} //  esto lo hace controlado
                                            onChange={e => internalForm.setFieldValue("quien_paga_delivery", normalizeDeliveryPayer(e.target.value))}
                                            disabled={!isAdmin}
                                        >
                                            <Radio.Button value="comprador">COMPRADOR</Radio.Button>
                                            <Radio.Button value="vendedor">VENDEDOR</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>

                                </Col>
                            </Row>

                            <Row gutter={16}>
                                {["comprador", "vendedor"].includes(quienPagaDelivery || "") && (
                                    <Col span={12}>
                                        <Form.Item
                                            name="cargo_delivery"
                                            label="Monto cobrado por el Delivery"
                                            rules={
                                                (!isAdmin && (quienPagaDelivery === 'vendedor' || quienPagaDelivery === 'comprador'))
                                                    ? []
                                                    : [{ required: true, message: "Este campo es obligatorio" }]
                                            }
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                value={montoDelivery}
                                                onChange={val => setMontoDelivery(val ?? 0)}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>

                                    </Col>
                                )}

                                <Col span={12}>
                                    {isAdmin && (
                                        <Form.Item
                                            name="costo_delivery"
                                            label="Costo de realizar el Delivery"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                value={costoDelivery}
                                                onChange={val => setCostoDelivery(val ?? 0)}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>
                                    )}
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Saldo a cobrar */}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Saldo a Cobrar">
                                <Input
                                    prefix="Bs."
                                    readOnly
                                    value={saldoACobrar.toFixed(2)}
                                    style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Tipo de pago */}
                    {estadoPedidoForm === "Entregado" && (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="tipo_de_pago" label="Tipo de pago" rules={[{ required: true }]}>
                                        <>
                                            <Radio.Group
                                                value={tipoPago}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    if (value === "3") {
                                                        if (tipoPago === "3") return;

                                                        if (!clickedOnce) {
                                                            setClickedOnce(true);
                                                            setTimeout(() => setClickedOnce(false), 4000);
                                                            return;
                                                        }

                                                        internalForm.setFieldValue("adelanto_cliente", 0);
                                                        setClickedOnce(false);
                                                    }

                                                    setTipoPago(value);
                                                    internalForm.setFieldValue("tipo_de_pago", value);
                                                }}
                                                disabled={!isAdmin || estaPagado === "si"}
                                            >
                                                <Radio.Button value="1">Transferencia o QR</Radio.Button>
                                                <Radio.Button value="2">Efectivo</Radio.Button>
                                                <Radio.Button value="3">Pagado al dueño</Radio.Button>
                                                <Radio.Button value="4">Efectivo + QR</Radio.Button>
                                            </Radio.Group>

                                            {clickedOnce && (
                                                <div
                                                    style={{
                                                        color: 'red',
                                                        fontSize: '12px',
                                                        marginTop: 4,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    Haz clic de nuevo para confirmar el cambio. Se borrará el adelanto.
                                                </div>
                                            )}
                                        </>
                                    </Form.Item>
                                </Col>
                            </Row>

                            {["1", "2"].includes(tipoPago || "") && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item label={tipoPago === "1" ? "Subtotal QR" : "Subtotal Efectivo"}>
                                            <InputNumber
                                                prefix="Bs."
                                                value={saldoACobrar}
                                                readOnly
                                                style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )}

                            {tipoPago === "4" && (
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Subtotal QR" name="subtotal_qr">
                                            <InputNumber
                                                prefix="Bs."
                                                min={0.01}
                                                max={saldoACobrar - 0.01}
                                                value={qrInput}
                                                onChange={(val) => {
                                                    const qr = val ?? 0;
                                                    const efectivo = parseFloat((saldoACobrar - qr).toFixed(2));
                                                    setQrInput(qr);
                                                    setEfectivoInput(efectivo);
                                                    internalForm.setFieldValue('subtotal_efectivo', efectivo);
                                                }}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                            <InputNumber
                                                prefix="Bs."
                                                value={efectivoInput}
                                                readOnly
                                                style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    {showWarning && (
                                        <Col span={24}>
                                            <div style={{ color: 'red', fontWeight: 'bold' }}>
                                                La suma de QR + Efectivo debe ser igual al saldo a cobrar.
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            )}
                        </>
                    )}
                </Card>

            </Form>
            {isAdmin && (
                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button style={{ marginRight: 8 }} onClick={handleCancelChanges}>
                        Cancelar
                    </Button>
                    <Button type="primary" loading={loading} onClick={() => internalForm.submit()}>
                        Guardar Cambios
                    </Button>
                </div>
            )}

            <EditProductsModal
                visible={editProductsModalVisible}
                onCancel={() => setEditProductsModalVisible(false)}
                products={products as any[]}
                setProducts={setProducts}
                allProducts={enrichedProducts}
                sellers={sellers}
                isAdmin={isAdmin}
                shippingId={id_shipping}
                sucursalId={origenBranchId || localStorage.getItem("sucursalId")}
                allowAddProducts={true} // Explícitamente permitir agregar productos
                onSave={() => {
                    setEditProductsModalVisible(false);
                    message.success("Cambios guardados");
                }}
            />
        </Modal>
    );
}

export default ShippingInfoModal;

