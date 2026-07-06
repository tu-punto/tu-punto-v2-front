import { ArrowRightOutlined, InboxOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Input, InputNumber, message, Modal, Pagination, Radio, Select, Table, Tooltip } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { getShippingsListAPI, getShippingByIdAPI, markSellerWithdrawalAPI, rejectCatalogOrderAPI, updateShippingAPI } from '../../api/shipping';
import { getExternalSaleByIdAPI, getExternalSalesListAPI } from '../../api/externalSale';
import ShippingInfoModal from './ShippingInfoModal';
import ShippingStateModal from './ShippingStateModal';
import ExternalPackagesFormModal from './ExternalPackagesFormModal';
import ExternalShippingInfoModal from './ExternalShippingInfoModal';
import SimplePackageManagerModal from './SimplePackageManagerModal';
import { getSucursalsBasicAPI } from '../../api/sucursal';
import { getSellersBasicAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext.tsx";
import { isSuperadminUser } from "../../utils/role";
import moment from "moment-timezone";

const { RangePicker } = DatePicker;
const { Option } = Select;
const EXTERNAL_VENDOR_FILTER = "__EXTERNO__";
const VISUAL_IN_TRANSIT_THRESHOLD_MINUTES = 30;
const MOBILE_CARD_PAGE_SIZE = 12;

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const getOriginBranchName = (pedido: any) => {
    const lugar = pedido?.lugar_origen;
    if (typeof lugar === "object" && lugar !== null) {
        return String(lugar.nombre || "");
    }

    return "";
};

const isDeliveryOrder = (pedido: any) => {
    if (pedido?.is_external) {
        return Boolean(pedido?.delivery || pedido?.direccion_delivery);
    }

    const origin = normalizeText(getOriginBranchName(pedido));
    const destination = normalizeText(pedido?.lugar_entrega);

    if (origin && destination) {
        return origin !== destination;
    }

    return Boolean(
        pedido?.venta?.some((venta: any) => ["comprador", "vendedor"].includes(String(venta?.quien_paga_delivery || "").toLowerCase())) ||
        pedido?.cargo_delivery ||
        pedido?.costo_delivery
    );
};

const resolveBranchId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
        return String(value?._id || value?.id_sucursal || value?.id || "");
    }
    return "";
};

const getVisualStatusMeta = (pedido: any, now: moment.Moment) => {
    const estadoReal = String(pedido?.estado_pedido || "").trim();

    if (estadoReal === "Entregado" && pedido?.retirado_por_vendedor === true) {
        return {
            label: "Vendedor retiro el paquete",
            tone: {
                text: "#ad4e00",
                border: "#ffd591",
                background: "#fff7e6",
                dot: "#fa8c16",
            },
            tooltip: undefined,
            isVisualOnly: false,
        };
    }

    if (estadoReal === "Entregado") {
        return {
            label: "Entregado",
            tone: {
                text: "#237804",
                border: "#b7eb8f",
                background: "#f6ffed",
                dot: "#52c41a",
            },
            tooltip: undefined,
            isVisualOnly: false,
        };
    }

    const fechaObjetivo = pedido?.hora_entrega_rango_final || pedido?.hora_entrega_acordada;
    const horaObjetivo = fechaObjetivo ? moment.parseZone(fechaObjetivo) : null;
    const shouldLookInTransit =
        estadoReal === "En Espera" &&
        isDeliveryOrder(pedido) &&
        horaObjetivo?.isValid() &&
        horaObjetivo.diff(now, "minutes", true) <= VISUAL_IN_TRANSIT_THRESHOLD_MINUTES;

    if (shouldLookInTransit) {
        return {
            label: "En camino",
            tone: {
                text: "#ad6800",
                border: "#ffd591",
                background: "#fff7e6",
                dot: "#fa8c16",
            },
            tooltip: undefined,
            isVisualOnly: true,
        };
    }

    return {
        label: estadoReal || "En Espera",
        tone: {
            text: "#1d39c4",
            border: "#adc6ff",
            background: "#f0f5ff",
            dot: "#2f54eb",
        },
        tooltip: undefined,
        isVisualOnly: false,
    };
};

const ShippingTable = ({ refreshKey, onOpenQR }: { refreshKey: number; onOpenQR?: () => void }) => {
    const { user }: any = useContext(UserContext);
    const [shippingData, setShippingData] = useState([]);
    const [esperaData, setEsperaData] = useState([]);
    const [enCaminoData, setEnCaminoData] = useState([]);
    const [entregadoData, setEntregadoData] = useState([]);
    const [filteredEsperaData, setFilteredEsperaData] = useState([]);
    const [filteredEnCaminoData, setFilteredEnCaminoData] = useState([]);
    const [filteredEntregadoData, setFilteredEntregadoData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState<'En Espera' | 'en_camino' | 'entregado'>('En Espera');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isModaStatelVisible, setIsModalStateVisible] = useState(false);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [selectedExternalShipping, setSelectedExternalShipping] = useState<any>(null);
    const [isExternalInfoVisible, setIsExternalInfoVisible] = useState(false);
    const [isExternalCreateVisible, setIsExternalCreateVisible] = useState(false);
    const [isSimplePackageManagerVisible, setIsSimplePackageManagerVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [otherLocation, setOtherLocation] = useState('');
    const [sucursal, setSucursal] = useState([] as any[]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [selectedVendedor, setSelectedVendedor] = useState("");
    const [searchCliente, setSearchCliente] = useState(""); // Nuevo estado para búsqueda de cliente
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isVendedor = user?.role?.toLowerCase() === 'vendedor';
    const isOperator = user?.role.toLowerCase() === 'operator';
    //console.log("Usuario:", user);
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
    const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
    const [loadingTable, setLoadingTable] = useState(false);
    const [statusNow, setStatusNow] = useState(() => moment().tz("America/La_Paz"));
    const [mobilePage, setMobilePage] = useState(1);
    const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
    const [markingSellerWithdrawal, setMarkingSellerWithdrawal] = useState(false);
    const [markingBranchTransfer, setMarkingBranchTransfer] = useState(false);
    const [rejectingCatalogOrderId, setRejectingCatalogOrderId] = useState("");
    const [branchTransferModal, setBranchTransferModal] = useState<{
        open: boolean;
        mode: "send" | "receive" | null;
        rows: any[];
        totalDeliveryCost: number;
        paymentMethod: "1" | "2";
    }>({
        open: false,
        mode: null,
        rows: [],
        totalDeliveryCost: 0,
        paymentMethod: "2",
    });
    const [branchTransferError, setBranchTransferError] = useState("");

    const [isMobile, setIsMobile] = useState(false);
    const canManageExternal = isAdmin || isOperator || isSuperadminUser(user);
    const currentSucursalId = localStorage.getItem("sucursalId") || "";
    const currentSucursal = sucursal.find((s: any) =>
        String(s._id) === String(currentSucursalId) ||
        String(s.id_sucursal) === String(currentSucursalId)
    );
    const inTransitCount = filteredEnCaminoData.length;

    const getOriginBranchId = (pedido: any) =>
        resolveBranchId(pedido?.lugar_origen) ||
        resolveBranchId(pedido?.origen_sucursal) ||
        resolveBranchId(pedido?.sucursal);

    const getDestinationBranchId = (pedido: any) =>
        resolveBranchId(pedido?.destino_sucursal) ||
        resolveBranchId(pedido?.sucursal) ||
        resolveBranchId(pedido?.lugar_entrega);

    const isInterbranchTransfer = (pedido: any) => {
        const originId = getOriginBranchId(pedido);
        const destinationId = getDestinationBranchId(pedido);
        return Boolean(originId && destinationId && String(originId) !== String(destinationId));
    };

    const isPendingSend = (pedido: any) =>
        String(pedido?.estado_pedido || "") === "En Espera" &&
        isInterbranchTransfer(pedido) &&
        String(getOriginBranchId(pedido)) === String(currentSucursalId);

    const isPendingReceive = (pedido: any) =>
        String(pedido?.estado_pedido || "") === "En camino" &&
        isInterbranchTransfer(pedido) &&
        String(getDestinationBranchId(pedido)) === String(currentSucursalId);

    const mapExternalToShipping = (externalSale: any) => {
        const estaPagado =
            externalSale?.esta_pagado === "mixto"
                ? "mixto"
                : (externalSale?.esta_pagado === "si" ? "si" : "no");
        const precioPaquete = Number(externalSale?.precio_paquete ?? externalSale?.precio_total ?? 0);
        const pagaComprador = Number(externalSale?.monto_paga_comprador ?? 0);
        const estadoPedido = externalSale?.estado_pedido || (externalSale?.delivered ? "Entregado" : "En Espera");
        const fechaBase = externalSale?.fecha_pedido || new Date().toISOString();
        const sucursalOrigen =
            typeof externalSale?.origen_sucursal === "object"
                ? externalSale.origen_sucursal
                : typeof externalSale?.sucursal === "object"
                    ? externalSale.sucursal
                    : null;
        const destinationLabel =
            externalSale?.lugar_entrega ||
            externalSale?.destino_sucursal?.nombre ||
            sucursalOrigen?.nombre ||
            (externalSale?.service_origin === "simple_package" ? "Simple" : "Externo");

        return {
            ...externalSale,
            key: `external-${externalSale._id}`,
            is_external: true,
            cliente: externalSale?.comprador || "Sin comprador",
            telefono_cliente: externalSale?.telefono_comprador || "",
            carnet_cliente: externalSale?.carnet_comprador || "",
            hora_entrega_acordada: fechaBase,
            hora_entrega_real: externalSale?.hora_entrega_real || fechaBase,
            lugar_origen: sucursalOrigen,
            lugar_entrega: destinationLabel,
            id_sucursal: sucursalOrigen?._id || externalSale?.origen_sucursal || externalSale?.sucursal || externalSale?.id_sucursal,
            sucursal: sucursalOrigen,
            estado_pedido: estadoPedido,
            esta_pagado: estaPagado,
            saldo_cobrar: Number(
                externalSale?.deuda_comprador ??
                externalSale?.saldo_cobrar ??
                (estaPagado === "si" ? 0 : estaPagado === "mixto" ? pagaComprador : precioPaquete)
            ),
            numero_guia: externalSale?.numero_guia || "",
            observaciones: externalSale?.descripcion_paquete || "",
            venta: [],
            productos_temporales: [],
        };
    };

    const isSellerWithdrawalCandidate = (pedido: any) =>
        canManageExternal &&
        String(pedido?.estado_pedido || "") === "En Espera" &&
        (pedido?.is_external || pedido?.simple_package_order || pedido?.simple_package_source_id);
    const getCurrentSellerWithdrawalRows = () => {
        const activeRows =
            selectedStatus === 'entregado'
                ? filteredEntregadoData
                : selectedStatus === 'en_camino'
                    ? filteredEnCaminoData
                    : filteredEsperaData;
        const selectedKeys = new Set(selectedRowKeys.map(String));
        return (activeRows as any[]).filter((row: any) => {
            const rowKey = String(row?.key ?? row?._id ?? "");
            return selectedKeys.has(rowKey) && isSellerWithdrawalCandidate(row);
        });
    };
    const selectedSellerWithdrawalCount = getCurrentSellerWithdrawalRows().length;

    const toggleStatus = () => {
        setSelectedStatus(prev => prev === 'entregado' ? 'En Espera' : 'entregado');
    };

    const handleMarkSellerWithdrawal = () => {
        if (!selectedSellerWithdrawalCount) {
            message.warning("Selecciona entregas simples o externas en espera");
            return;
        }

        Modal.confirm({
            title: "Marcar retiro por vendedor",
            content: `Se marcaran ${selectedSellerWithdrawalCount} entrega(s) como retiradas por el vendedor. Se cobraran igual que una entrega normal.`,
            okText: "Marcar retiro",
            cancelText: "Cancelar",
            onOk: async () => {
                setMarkingSellerWithdrawal(true);
                try {
                    const rowsToMark = getCurrentSellerWithdrawalRows();
                    if (!rowsToMark.length) {
                        setSelectedRowKeys([]);
                        message.warning("La seleccion ya no tiene entregas en espera para marcar");
                        return;
                    }
                    const externalSaleIds = rowsToMark
                        .filter((row: any) => row.is_external)
                        .map((row: any) => String(row._id));
                    const shippingIds = rowsToMark
                        .filter((row: any) => !row.is_external)
                        .map((row: any) => String(row._id));
                    const response = await markSellerWithdrawalAPI({
                        shippingIds,
                        externalSaleIds,
                        withdrawnAt: moment().tz("America/La_Paz").toISOString(),
                    });

                    if (!response?.success && !response?.updatedCount) {
                        message.error(response?.message || "No se pudo marcar el retiro");
                        return;
                    }

                    if (response.failedCount > 0) {
                        message.warning(`Se marcaron ${response.updatedCount || 0}; ${response.failedCount} fallaron`);
                    } else {
                        message.success(`Se marcaron ${response.updatedCount || rowsToMark.length} entrega(s)`);
                    }
                    setSelectedRowKeys([]);
                    fetchShippings();
                } finally {
                    setMarkingSellerWithdrawal(false);
                }
            },
        });
    };

    const handleBranchTransfer = (mode: "send" | "receive") => {
        const rowsToUpdate = (selectedStatus === "en_camino" ? filteredEnCaminoData : filteredEsperaData).filter((row: any) => {
            const rowKey = String(row?.key ?? row?._id ?? "");
            const isSelected = selectedRowKeys.map(String).includes(rowKey);
            if (!isSelected) return false;
            return mode === "send" ? isPendingSend(row) : isPendingReceive(row);
        });

        if (!rowsToUpdate.length) {
            message.warning(mode === "send" ? "Selecciona paquetes pendientes de enviar" : "Selecciona paquetes pendientes de recibir");
            return;
        }

        setBranchTransferModal({
            open: true,
            mode,
            rows: rowsToUpdate,
            totalDeliveryCost: 0,
            paymentMethod: "2",
        });
        setBranchTransferError("");
    };

    const closeBranchTransferModal = () => {
        if (markingBranchTransfer) return;
        setBranchTransferError("");
        setBranchTransferModal({ open: false, mode: null, rows: [], totalDeliveryCost: 0, paymentMethod: "2" });
    };

    const submitBranchTransfer = async () => {
        const { mode, rows } = branchTransferModal;
        if (!mode || !rows.length) return;

        const totalDeliveryCost = Number(branchTransferModal.totalDeliveryCost || 0);
        const costPerPackage = rows.length > 0 ? Number((totalDeliveryCost / rows.length).toFixed(2)) : 0;

        setMarkingBranchTransfer(true);
        setBranchTransferError("");
        try {
            const updates = await Promise.all(
                rows.map((row: any) =>
                    updateShippingAPI(
                        mode === "send"
                            ? {
                                estado_pedido: "En camino",
                                costo_delivery: costPerPackage,
                                tipo_de_pago: branchTransferModal.paymentMethod,
                              }
                            : {
                                estado_pedido: "Entregado",
                                hora_entrega_real: moment().tz("America/La_Paz").toISOString(),
                                public_tracking_ready_for_pickup_at: moment().tz("America/La_Paz").toISOString(),
                                costo_delivery: costPerPackage,
                                tipo_de_pago: branchTransferModal.paymentMethod,
                            },
                        String(row._id)
                    )
                )
            );

            const failedRows = updates.filter((item: any) => !item?.success);
            if (failedRows.length > 0) {
                const firstFailure = failedRows[0];
                const failureMessage = String(firstFailure?.message || firstFailure?.msg || "No se pudo actualizar el envio");
                setBranchTransferError(failureMessage);
                message.error(failureMessage);
            } else {
                message.success(
                    mode === "send"
                        ? `Se marcaron ${rows.length} paquete(s) como enviados`
                        : `Se confirmaron ${rows.length} llegada(s)`
                );
                setBranchTransferError("");
                setBranchTransferModal({ open: false, mode: null, rows: [], totalDeliveryCost: 0, paymentMethod: "2" });
                fetchShippings();
            }
            setSelectedRowKeys([]);
        } finally {
            setMarkingBranchTransfer(false);
        }
    };

    const fetchShippings = async () => {
        setLoadingTable(true);
        try {
            const from = dateRange[0] ? moment(dateRange[0]).startOf("day").toISOString() : undefined;
            const to = dateRange[1] ? moment(dateRange[1]).endOf("day").toISOString() : undefined;
            const status = selectedStatus === "entregado" ? "Entregado" : "En Espera";
            const originBranchId = currentSucursalId || undefined;
            const sellerIdToQuery =
                selectedVendedor && selectedVendedor !== EXTERNAL_VENDOR_FILTER
                    ? selectedVendedor
                    : (!isAdmin && !isOperator ? user?.id_vendedor : undefined);

            const [shippingApiData, externalApiData] = await Promise.all([
                getShippingsListAPI({
                    page: 1,
                    limit: 300,
                    status,
                    from,
                    to,
                    sellerId: sellerIdToQuery,
                    client: searchCliente.trim() || undefined
                }),
                canManageExternal
                    ? getExternalSalesListAPI({
                        page: 1,
                        limit: 300,
                        status,
                        from,
                        to,
                        sucursalId: originBranchId,
                        client: searchCliente.trim() || undefined
                    })
                    : Promise.resolve({ rows: [] }),
            ]);

            const internalShippings = Array.isArray(shippingApiData?.rows)
                ? shippingApiData.rows
                : Array.isArray(shippingApiData)
                    ? shippingApiData
                    : [];
            const externalRows = Array.isArray(externalApiData?.rows)
                ? externalApiData.rows
                : Array.isArray(externalApiData)
                    ? externalApiData
                    : [];
            const externalShippings = externalRows.map((sale: any) => mapExternalToShipping(sale));

            const sortedData = [...internalShippings, ...externalShippings].sort(
                (a: any, b: any) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()
            );
            const dataWithKey = sortedData.map((pedido: any) => ({
                ...pedido,
                key: pedido.is_external ? `external-${pedido._id}` : pedido._id
            }));
            setShippingData(dataWithKey);
        } catch (error) {
            console.error("Error fetching shipping data:", error);
        } finally {
            setLoadingTable(false);
        }
    };
    const toSimpleDate = (d: Date | null) =>
        d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

    const getVendedoresConEntregas = () => {
        const sourceData = selectedStatus === 'En Espera' ? esperaData : entregadoData;
        const vendedoresConEntregasSet = new Set<string>();

        sourceData.forEach((pedido: any) => {
            (pedido.venta || []).forEach((venta: any) => {
                if (venta.vendedor) {
                    const vendedorId =
                        typeof venta.vendedor === 'object'
                            ? venta.vendedor._id
                            : venta.vendedor;
                    if (vendedorId) vendedoresConEntregasSet.add(String(vendedorId));
                }
                if (venta.id_vendedor) {
                    vendedoresConEntregasSet.add(String(venta.id_vendedor));
                }
            });

            (pedido.productos_temporales || []).forEach((producto: any) => {
                if (producto.id_vendedor) {
                    vendedoresConEntregasSet.add(String(producto.id_vendedor));
                }
            });
        });

        return vendedores.filter((vendedor: any) =>
            vendedoresConEntregasSet.has(String(vendedor._id))
        );
    };
    const hasExternalInCurrentStatus = () => {
        const sourceData = selectedStatus === 'En Espera' ? esperaData : entregadoData;
        return sourceData.some((pedido: any) => !!pedido.is_external);
    };


    const filterByLocationAndDate = (data: any) => {
        return data.filter((pedido: any) => {
            const isOtherLocation = selectedLocation === 'other';
            const isExternal = !!pedido.is_external;
            const lugarEntregaLower = String(pedido.lugar_entrega || "").toLowerCase();

            const matchesLocation = isExternal
                ? (isOtherLocation
                    ? (!otherLocation || lugarEntregaLower.includes(otherLocation.toLowerCase()))
                    : (!selectedLocation || lugarEntregaLower.includes(selectedLocation.toLowerCase())))
                : (isOtherLocation
                    ? !sucursal.some((suc) => suc.nombre.toLowerCase() === lugarEntregaLower) &&
                    (!otherLocation || lugarEntregaLower.includes(otherLocation.toLowerCase()))
                    : !selectedLocation || lugarEntregaLower.includes(selectedLocation.toLowerCase()));
            const matchesDateRange =
                dateRange[0] && dateRange[1]
                    ? toSimpleDate(new Date(pedido.hora_entrega_acordada)) >= toSimpleDate(dateRange[0]) &&
                    toSimpleDate(new Date(pedido.hora_entrega_acordada)) <= toSimpleDate(dateRange[1])
                    : true;
            // Lógica actualizada para el filtro de vendedor
            const matchesVendedor = (isAdmin || isOperator)
                ? (isExternal
                    ? (selectedVendedor === EXTERNAL_VENDOR_FILTER || selectedVendedor === "Todos" || !selectedVendedor)
                    : (selectedVendedor === "Todos" || !selectedVendedor
                        ? true
                        : selectedVendedor === EXTERNAL_VENDOR_FILTER
                            ? false
                            : (pedido.venta?.some((v: any) => {
                                const vendedorId = typeof v.vendedor === 'object' ? v.vendedor._id : v.vendedor;
                                return vendedorId === selectedVendedor || v.id_vendedor === selectedVendedor;
                            }) ||
                                pedido.productos_temporales?.some((p: any) => p.id_vendedor === selectedVendedor))))
                : (!isExternal && (
                    pedido.venta?.some((v: any) => {
                        const vendedorId = typeof v.vendedor === 'object' ? v.vendedor._id : v.vendedor;
                        return v.id_vendedor === user?.id_vendedor || vendedorId === user?.id_vendedor;
                    }) ||
                    pedido.productos_temporales?.some((p: any) => p.id_vendedor === user?.id_vendedor)
                ));

            const searchValue = searchCliente.trim().toLowerCase();
            const matchesCliente = !searchValue || [
                pedido.cliente,
                pedido.telefono_cliente,
                pedido.carnet_cliente,
                pedido.numero_guia,
            ].some((value: any) => String(value || "").toLowerCase().includes(searchValue));

            return matchesLocation && matchesDateRange && matchesVendedor && matchesCliente;
        });
    };
    useEffect(() => {
        if (isVendedor && user?.id_vendedor) {
            setSelectedVendedor(user.id_vendedor);
        }
    }, [isVendedor, user]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setStatusNow(moment().tz("America/La_Paz"));
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setMobilePage(1);
        setSelectedRowKeys([]);
    }, [selectedStatus, selectedLocation, dateRange, selectedVendedor, searchCliente]);

    const columns = [
        {/*{
            title: '',
            dataIndex: 'infoButton',
            key: 'infoButton',
            width: '5%',
            render: (_: any, record: any) =>
                record.estado_pedido !== "Entregado" && (
                    <InfoCircleOutlined
                        style={{ fontSize: '20px', color: '#1890ff', cursor: 'pointer' }}
                        onClick={() => handleIconClick(record)}
                    />
                )
        },*/},
        {
            title: 'Fecha Pedido',
            dataIndex: 'hora_entrega_acordada',
            key: 'hora_entrega_acordada',
            render: (text: string) =>
                moment.parseZone(text).format("DD/MM/YYYY"),
            sorter: (a: any, b: any) =>
                moment.parseZone(a.hora_entrega_acordada).valueOf() -
                moment.parseZone(b.hora_entrega_acordada).valueOf(),
            sortOrder,
            onHeaderCell: () => ({
                onClick: () => {
                    setSortOrder(prev => (prev === 'ascend' ? 'descend' : 'ascend'));
                },
            }),
        },
        {
            title: 'Guia',
            dataIndex: 'numero_guia',
            key: 'numero_guia',
            render: (value: any) => value || '-',
        },
        {
            title: 'Lugar de Origen',
            dataIndex: 'lugar_origen',
            key: 'lugar_origen',
            render: (_: any, record: any) => {
                const lugar = record.lugar_origen;
                if (typeof lugar === 'object' && lugar !== null) {
                    return lugar.nombre || '—';
                }
                const suc = sucursal.find((s) => s._id === lugar || s._id === record.id_sucursal);
                return suc?.nombre || '—';
            }
        },
        {
            title: 'Lugar de entrega',
            dataIndex: 'lugar_entrega',
            key: 'lugar_entrega'
        },
        {
            title: 'Estado',
            key: 'estado_visual',
            width: 150,
            render: (_: any, record: any) => {
                const statusMeta = getVisualStatusMeta(record, statusNow);

                return (
                    <Tooltip title={statusMeta.tooltip}>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: `1px solid ${statusMeta.tone.border}`,
                                background: statusMeta.tone.background,
                                color: statusMeta.tone.text,
                                fontSize: 12,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            <span
                                className={statusMeta.isVisualOnly ? "animate-pulse" : ""}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: statusMeta.tone.dot,
                                    flexShrink: 0,
                                }}
                            />
                            {statusMeta.label}
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (_: any, record: any) => {
                if (record.is_external) {
                    if (String(record?.service_origin || "") === "simple_package") {
                        return record?.vendedor || 'Sin vendedor';
                    }
                    return <span style={{ color: '#cf1322', fontWeight: 700 }}>Externo</span>;
                }

                const vendedoresUnicos = new Map();

                // 1. De ventas normales
                (record.venta || []).forEach((v: any) => {
                    if (v.vendedor) {
                        vendedoresUnicos.set(v.vendedor._id, `${v.vendedor.nombre} ${v.vendedor.apellido}`);
                    } else if (v.id_vendedor) {
                        const vend = vendedores.find(vend => vend._id === v.id_vendedor);
                        if (vend) {
                            vendedoresUnicos.set(vend._id, `${vend.nombre} ${vend.apellido}`);
                        }
                    }
                });

                // 2. De productos temporales
                (record.productos_temporales || []).forEach((p: any) => {
                    const vend = vendedores.find(vend => vend._id === p.id_vendedor);
                    if (vend) {
                        vendedoresUnicos.set(vend._id, `${vend.nombre} ${vend.apellido}`);
                    }
                });

                const vendedorArray = Array.from(vendedoresUnicos.values());

                if (vendedorArray.length === 0) return 'Sin vendedor';
                if (vendedorArray.length <= 3) return vendedorArray.join(', ');

                return (
                    <>
                        {vendedorArray.slice(0, 2).join(', ')}{' '}
                        <span style={{ color: '#1890ff', cursor: 'pointer' }} title={vendedorArray.join(', ')}>
                            +{vendedorArray.length - 2} más
                        </span>
                    </>
                );
            }
        },
        {
            title: 'Canal',
            key: 'origen_pedido',
            render: (_: any, record: any) =>
                record?.origen_pedido === "catalogo"
                    ? <span style={{ color: "#0958d9", background: "#e6f4ff", border: "1px solid #91caff", borderRadius: 999, padding: "3px 9px", fontWeight: 700 }}>Catalogo</span>
                    : <span>Interno</span>,
        },
        {
            title: 'Cliente',
            dataIndex: 'cliente',
            key: 'cliente',
        },
        {
            title: 'Celular',
            dataIndex: 'telefono_cliente',
            key: 'telefono_cliente',
            render: (value: any) => value || '—',
        },
        {
            title: 'Carnet',
            dataIndex: 'carnet_cliente',
            key: 'carnet_cliente',
            render: (value: any) => value || '—',
        },
        {
            title: 'Acciones',
            key: 'catalog_actions',
            render: (_: any, record: any) =>
                record?.origen_pedido === "catalogo" && record?.estado_pedido === "En Espera" && canManageExternal ? (
                    <Button
                        danger
                        loading={rejectingCatalogOrderId === String(record._id)}
                        onClick={(event) => {
                            event.stopPropagation();
                            let reason = "";
                            Modal.confirm({
                                title: "Rechazar pedido de catalogo",
                                content: (
                                    <Input
                                        placeholder="Motivo del rechazo"
                                        onChange={(inputEvent) => { reason = inputEvent.target.value; }}
                                    />
                                ),
                                okText: "Rechazar",
                                okButtonProps: { danger: true },
                                cancelText: "Cancelar",
                                onOk: async () => {
                                    setRejectingCatalogOrderId(String(record._id));
                                    try {
                                        const result = await rejectCatalogOrderAPI(String(record._id), reason);
                                        if (!result?.success) throw new Error(result?.message || "No se pudo rechazar");
                                        message.success("Pedido rechazado y notificado al catalogo");
                                        await fetchShippings();
                                    } catch (error: any) {
                                        message.error(error?.message || "No se pudo rechazar el pedido");
                                    } finally {
                                        setRejectingCatalogOrderId("");
                                    }
                                },
                            });
                        }}
                    >
                        Rechazar
                    </Button>
                ) : null,
        },
    ];
    const visibleColumns = columns.filter(Boolean);
    const currentRows =
            selectedStatus === 'entregado'
                ? filteredEntregadoData
                : selectedStatus === 'en_camino'
                    ? filteredEnCaminoData
                    : filteredEsperaData;
    const mobileRows = (currentRows as any[]).slice(
        (mobilePage - 1) * MOBILE_CARD_PAGE_SIZE,
        mobilePage * MOBILE_CARD_PAGE_SIZE
    );

    const openShippingDetail = async (record: any) => {
        if (record.is_external) {
            const fullExternal = await getExternalSaleByIdAPI(record._id);
            if (fullExternal?.success === false) {
                message.error(fullExternal.message || "No se pudo cargar la entrega externa");
                return;
            }
            setSelectedExternalShipping(fullExternal);
            setIsExternalInfoVisible(true);
            return;
        }
        const fullShipping = await getShippingByIdAPI(record._id);
        console.log("Pedido completo con ventas:", fullShipping);
        setSelectedShipping(fullShipping);
        setIsModalVisible(true);
    };

    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsBasicAPI();
            setSucursal(Array.isArray(response) ? response : []);
        } catch (error) {
            message.error('Error al obtener las sucursales');
        }
    };

    useEffect(() => {
        fetchSucursal();
    }, []);

    useEffect(() => {
        fetchShippings();
    }, [
        refreshKey,
        canManageExternal,
        selectedStatus,
        dateRange,
        selectedVendedor,
        searchCliente,
        user?.id_vendedor,
        sucursal.length
    ]);

    useEffect(() => {
        setEsperaData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En Espera'));
        setEnCaminoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En camino'));
        setEntregadoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'Entregado'));
    }, [shippingData]);

    useEffect(() => {
        setFilteredEsperaData(filterByLocationAndDate(esperaData));
        setFilteredEnCaminoData(filterByLocationAndDate(enCaminoData));
        setFilteredEntregadoData(filterByLocationAndDate(entregadoData));
    }, [esperaData, enCaminoData, entregadoData, selectedLocation, dateRange, selectedVendedor, searchCliente]);
    useEffect(() => {
        const fetchVendedores = async () => {
            try {
                const response = await getSellersBasicAPI();
                setVendedores(Array.isArray(response) ? response : []);
            } catch (error) {
                message.error("Error al obtener vendedores");
            }
        };
        fetchVendedores();
    }, []);
    //console.log("Rol", user?.role?.toLowerCase());
    return (
        <div>
            <style>{`
                @keyframes shippingStatusPanelFade {
                    from {
                        opacity: 0;
                        transform: translateY(6px) scale(0.995);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
            <div className="shipping-filter-panel mb-4 bg-white rounded-xl border border-gray-200 p-3">
                <div className="shipping-filter-grid">
                {(isAdmin || isOperator) && (
                    <Select
                        className="shipping-filter-vendor"
                        placeholder="Vendedores"
                        value={selectedVendedor || undefined}
                        onChange={(value) => setSelectedVendedor(value || "")}
                        allowClear
                        showSearch
                        filterOption={(input, option) => {
                            const label =
                                (option?.children ??
                                    // por si en algún momento usas `options` en vez de `<Option>`
                                    (option as any)?.label ??
                                    "");

                            return String(label)
                                .toLowerCase()
                                .includes(input.toLowerCase());
                        }}
                    >
                        {hasExternalInCurrentStatus() && (
                            <Option value={EXTERNAL_VENDOR_FILTER}>Externo</Option>
                        )}
                        {getVendedoresConEntregas().map((vendedor: any) => (
                            <Option key={vendedor._id} value={vendedor._id}>
                                {vendedor.nombre} {vendedor.apellido}
                            </Option>
                        ))}
                    </Select>
                )}
                <Input
                    className="shipping-filter-search"
                    placeholder="Buscar nombre, carnet, celular o guia..."
                    value={searchCliente}
                    onChange={(e) => setSearchCliente(e.target.value)}
                    allowClear
                />
                {
                /*
                <Select
                    style={{ width: 200, margin: 8 }}
                    placeholder="Estado del pedido"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value)}
                >
                    <Option value="En Espera">En Espera</Option>
                    <Option value="entregado">Entregado</Option>
                </Select>

                */}
                <Select
                    className="shipping-filter-destination"
                    placeholder="Sucursal De Destino"
                    onChange={(value) => {
                        setSelectedLocation(value || '');
                        if (value !== 'other') {
                            setOtherLocation('');
                        }
                    }}
                    allowClear
                >
                    <Option value="other">Otro lugar</Option>
                    {sucursal.map((suc: any) => (
                        <Option key={suc._id || suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                {selectedLocation === 'other' && (
                    <Input
                        className="shipping-filter-other"
                        placeholder="Especificar otro lugar"
                        value={otherLocation}
                        onChange={(e) => setOtherLocation(e.target.value)}
                    />
                )}
                {isMobile ? (
                    <>
                        <DatePicker
                            className="shipping-filter-start"
                            placeholder="Start date"
                            open={openPicker === 'start'}
                            value={dateRange[0] ? moment(dateRange[0]) : null}
                            onFocus={() => setOpenPicker('start')}
                            onBlur={() => setOpenPicker(null)}
                            onChange={date => {
                                setDateRange([date ? date.toDate() : null, dateRange[1]]);
                                setOpenPicker(null);
                            }}
                        />
                        <DatePicker
                            className="shipping-filter-end"
                            placeholder="End date"
                            open={openPicker === 'end'}
                            value={dateRange[1] ? moment(dateRange[1]) : null}
                            onFocus={() => setOpenPicker('end')}
                            onBlur={() => setOpenPicker(null)}
                            onChange={date => {
                                setDateRange([dateRange[0], date ? date.toDate() : null]);
                                setOpenPicker(null);
                            }}
                        />
                    </>
                ) : (
                    <RangePicker
                        className="mt-2"
                        style={{ width: 240, margin: 0 }}
                        value={[
                            dateRange[0] ? moment(dateRange[0]) : null,
                            dateRange[1] ? moment(dateRange[1]) : null,
                        ]}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) {
                                setDateRange([dates[0].toDate(), dates[1].toDate()]);
                            } else {
                                setDateRange([null, null]);
                            }
                        }}
                    />
                )}
                {canManageExternal && (
                    <Tooltip title="Registrar entrega externa">
                        <Button
                            className="shipping-filter-action shipping-filter-create"
                            type="primary"
                            icon={<span className="inline-flex items-center gap-0.5"><InboxOutlined /><ArrowRightOutlined /></span>}
                            onClick={() => setIsExternalCreateVisible(true)}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
                        >
                            Externos
                        </Button>
                    </Tooltip>
                )}
                {canManageExternal && (
                    <Tooltip title="Gestionar paquetes del servicio">
                        <Button
                            className="shipping-filter-action shipping-filter-packages"
                            type="default"
                            icon={<InboxOutlined />}
                            onClick={() => setIsSimplePackageManagerVisible(true)}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
                        >
                            Paquetes
                        </Button>
                    </Tooltip>
                )}
                {canManageExternal && selectedStatus !== "entregado" && (
                    <Tooltip title="Marcar entregas simples o externas como retiradas por el vendedor">
                        <Button
                            className="shipping-filter-action"
                            type="default"
                            onClick={handleMarkSellerWithdrawal}
                            loading={markingSellerWithdrawal}
                            disabled={!selectedSellerWithdrawalCount}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
                        >
                            Retiro vendedor{selectedSellerWithdrawalCount ? ` (${selectedSellerWithdrawalCount})` : ""}
                        </Button>
                    </Tooltip>
                )}
                {canManageExternal && selectedStatus === "En Espera" && (
                    <Tooltip title="Marcar paquetes seleccionados como enviados a su sucursal destino">
                        <Button
                            className="shipping-filter-action"
                            type="primary"
                            loading={markingBranchTransfer}
                            disabled={!selectedRowKeys.length}
                            onClick={() => handleBranchTransfer("send")}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
                        >
                            Enviar sucursal
                        </Button>
                    </Tooltip>
                )}
                {canManageExternal && selectedStatus === "en_camino" && (
                    <Tooltip title="Confirmar que los paquetes llegaron a la sucursal destino">
                        <Button
                            className="shipping-filter-action"
                            type="primary"
                            loading={markingBranchTransfer}
                            disabled={!selectedRowKeys.length}
                            onClick={() => handleBranchTransfer("receive")}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700, background: "#16a34a", borderColor: "#16a34a" }}
                        >
                            Confirmar llegada
                        </Button>
                    </Tooltip>
                )}
                {onOpenQR && (
                    <Tooltip title="Escanear QR de pedidos">
                        <Button
                            className="shipping-filter-action shipping-filter-qr"
                            type="default"
                            icon={<QrcodeOutlined />}
                            onClick={onOpenQR}
                            style={{ height: 46, borderRadius: 10, fontSize: 18 }}
                        />
                    </Tooltip>
                )}
                </div>
            </div>

            {/*selectedStatus === 'En Espera' && (
                <>
                    <h2 className="text-mobile-sm xl:text-desktop-3xl text-center mb-4 font-bold">En Espera</h2>
                    <Table
                        columns={columns}
                        dataSource={filteredEsperaData}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        onRow={(record) => ({
                            onClick: async () => {
                                const fullShipping = await getShippingByIdAPI(record._id);
                                console.log("📦 Pedido completo con ventas:", fullShipping);
                                setSelectedShipping(fullShipping);
                                setIsModalVisible(true);
                            },
                        })}
                    />
                </>
            )*/}

            {/*selectedStatus === 'entregado' && (
                <>
                    <h2 className="text-mobile-sm xl:text-desktop-3xl text-center mb-4 font-bold">Entregado</h2>
                    <Table
                        columns={columns}
                        dataSource={filteredEntregadoData}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        onRow={(record) => ({
                            onClick: async () => {
                                const fullShipping = await getShippingByIdAPI(record._id);
                                console.log("📦 Pedido completo con ventas:", fullShipping);
                                setSelectedShipping(fullShipping);
                                setIsModalVisible(true);
                            },
                        })}
                    />
                </>
            )*/}

            <div className="mb-5 flex justify-center">
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 999,
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('En Espera')}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 999,
                            padding: "10px 16px",
                            border: selectedStatus === "En Espera" ? "1px solid #93c5fd" : "1px solid #d1d5db",
                            background: selectedStatus === "En Espera" ? "#eff6ff" : "#ffffff",
                            color: selectedStatus === "En Espera" ? "#1d4ed8" : "#111827",
                            fontWeight: 700,
                            boxShadow: selectedStatus === "En Espera" ? "0 8px 22px rgba(59, 130, 246, 0.16)" : "none",
                            transform: selectedStatus === "En Espera" ? "translateY(-1px)" : "translateY(0)",
                            transition: "all 220ms ease",
                        }}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedStatus === "En Espera" ? "#2563eb" : "#9ca3af", transition: "all 220ms ease" }} />
                        <span>En Espera</span>
                        {filteredEsperaData.length > 0 && (
                            <span style={{ borderRadius: 999, padding: "2px 8px", background: selectedStatus === "En Espera" ? "#dbeafe" : "#f3f4f6", fontSize: 12, transition: "all 220ms ease" }}>
                                {filteredEsperaData.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedStatus('en_camino')}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 999,
                            padding: "10px 16px",
                            border: selectedStatus === "en_camino" ? "1px solid #fdba74" : "1px solid #d1d5db",
                            background: selectedStatus === "en_camino" ? "#fff7ed" : "#ffffff",
                            color: selectedStatus === "en_camino" ? "#c2410c" : "#111827",
                            fontWeight: 700,
                            boxShadow: selectedStatus === "en_camino" ? "0 8px 22px rgba(249, 115, 22, 0.16)" : "none",
                            transform: selectedStatus === "en_camino" ? "translateY(-1px)" : "translateY(0)",
                            transition: "all 220ms ease",
                        }}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedStatus === "en_camino" ? "#f97316" : "#9ca3af", transition: "all 220ms ease" }} />
                        <span>En camino</span>
                        {inTransitCount > 0 && (
                            <span style={{ borderRadius: 999, padding: "2px 8px", background: selectedStatus === "en_camino" ? "#ffedd5" : "#f3f4f6", fontSize: 12, transition: "all 220ms ease" }}>
                                {inTransitCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedStatus('entregado')}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 999,
                            padding: "10px 16px",
                            border: selectedStatus === "entregado" ? "1px solid #86efac" : "1px solid #d1d5db",
                            background: selectedStatus === "entregado" ? "#f0fdf4" : "#ffffff",
                            color: selectedStatus === "entregado" ? "#15803d" : "#111827",
                            fontWeight: 700,
                            boxShadow: selectedStatus === "entregado" ? "0 8px 22px rgba(34, 197, 94, 0.16)" : "none",
                            transform: selectedStatus === "entregado" ? "translateY(-1px)" : "translateY(0)",
                            transition: "all 220ms ease",
                        }}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedStatus === "entregado" ? "#22c55e" : "#9ca3af", transition: "all 220ms ease" }} />
                        <span>Entregado</span>
                        {filteredEntregadoData.length > 0 && (
                            <span style={{ borderRadius: 999, padding: "2px 8px", background: selectedStatus === "entregado" ? "#dcfce7" : "#f3f4f6", fontSize: 12, transition: "all 220ms ease" }}>
                                {filteredEntregadoData.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="hidden flex items-center justify-center gap-3 mb-4">
                <h2
                    className={`
            text-mobile-sm xl:text-desktop-3xl font-bold
            transition-all duration-300
            ${selectedStatus === 'En Espera' ? 'text-blue-700' : 'text-green-700'}
        `}
                >
                    {selectedStatus === 'En Espera' ? 'En Espera' : 'Entregado'}
                </h2>

                <button
                    type="button"
                    onClick={toggleStatus}
                    className={`
            relative flex items-center gap-1 rounded-full border px-3 py-1
            text-xs xl:text-sm font-medium
            transition-all duration-300
            shadow-sm
            ${selectedStatus === 'En Espera'
                        ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                        : 'bg-green-50 border-green-300 text-green-600 hover:bg-green-100'
                    }
        `}
                >
        <span
            className={`
                inline-flex items-center justify-center w-5 h-5 rounded-full
                bg-white/80
                text-[10px]
                transition-transform duration-300
                ${selectedStatus === 'En Espera' ? '' : 'rotate-180'}
            `}
        >
            ⇆
        </span>
                    <span>
            {selectedStatus === 'En Espera' ? 'Ver entregados' : 'Ver en espera'}
        </span>
                </button>
            </div>

            <div key={selectedStatus} style={{ animation: "shippingStatusPanelFade 220ms ease" }}>
            {isMobile && (
                <div className="shipping-mobile-list">
                    {mobileRows.map((record: any) => {
                        const statusMeta = getVisualStatusMeta(record, statusNow);
                        return (
                            <button
                                type="button"
                                className="shipping-mobile-card"
                                key={record.key || record._id}
                                onClick={() => openShippingDetail(record)}
                            >
                                <div className="shipping-mobile-card-header">
                                    <strong>{record.cliente || "Sin cliente"}</strong>
                                    <span
                                        style={{
                                            borderColor: statusMeta.tone.border,
                                            background: statusMeta.tone.background,
                                            color: statusMeta.tone.text,
                                        }}
                                    >
                                        {statusMeta.label}
                                    </span>
                                </div>
                                <div className="shipping-mobile-grid">
                                    <span>Fecha</span>
                                    <strong>{moment.parseZone(record.hora_entrega_acordada).format("DD/MM/YYYY")}</strong>
                                    <span>Guia</span>
                                    <strong>{record.numero_guia || "-"}</strong>
                                    <span>Destino</span>
                                    <strong>{record.lugar_entrega || "-"}</strong>
                                    <span>Celular</span>
                                    <strong>{record.telefono_cliente || "-"}</strong>
                                    <span>Carnet</span>
                                    <strong>{record.carnet_cliente || "-"}</strong>
                                </div>
                            </button>
                        );
                    })}
                    <Pagination
                        className="shipping-mobile-pagination"
                        current={mobilePage}
                        pageSize={MOBILE_CARD_PAGE_SIZE}
                        total={(currentRows as any[]).length}
                        showSizeChanger={false}
                        onChange={setMobilePage}
                        size="small"
                    />
                </div>
            )}
            <Table
                className="shipping-desktop-table"
                loading={loadingTable}
                columns={visibleColumns}
                dataSource={
                    selectedStatus === 'entregado'
                        ? filteredEntregadoData
                        : selectedStatus === 'en_camino'
                            ? filteredEnCaminoData
                            : filteredEsperaData
                }
                pagination={{
                    pageSize: 30,
                    showSizeChanger: true,
                    pageSizeOptions: ["15", "30", "50", "100"]
                }}
                rowSelection={
                    canManageExternal && selectedStatus !== "entregado"
                        ? {
                            selectedRowKeys,
                            onChange: (keys) => {
                                setSelectedRowKeys(keys);
                            },
                            getCheckboxProps: (record: any) => ({
                                disabled: !(isSellerWithdrawalCandidate(record) || isPendingSend(record) || isPendingReceive(record)),
                            }),
                        }
                        : undefined
                }
                scroll={{ x: "max-content" }}
                onRow={(record) => ({
                    onClick: async () => {
                        if ((record as any).is_external) {
                            const fullExternal = await getExternalSaleByIdAPI((record as any)._id);
                            if (fullExternal?.success === false) {
                                message.error(fullExternal.message || "No se pudo cargar la entrega externa");
                                return;
                            }
                            setSelectedExternalShipping(fullExternal);
                            setIsExternalInfoVisible(true);
                            return;
                        }
                        const fullShipping = await getShippingByIdAPI(record._id);
                        console.log("📦 Pedido completo con ventas:", fullShipping);
                        setSelectedShipping(fullShipping);
                        setIsModalVisible(true);
                    },
                })}
            />


            <Modal
                open={branchTransferModal.open}
                title={branchTransferModal.mode === "send" ? "Confirmar envio entre sucursales" : "Confirmar llegada a sucursal destino"}
                onCancel={closeBranchTransferModal}
                onOk={submitBranchTransfer}
                okText={branchTransferModal.mode === "send" ? "Marcar enviado" : "Confirmar llegada"}
                cancelText="Cancelar"
                confirmLoading={markingBranchTransfer}
                destroyOnClose
            >
                <div className="space-y-4">
                    {branchTransferError ? (
                        <Alert
                            type="error"
                            showIcon
                            message="No se pudo completar la operación"
                            description={branchTransferError}
                        />
                    ) : null}

                    <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Paquetes seleccionados</div>
                        <div className="text-2xl font-bold text-slate-900">{branchTransferModal.rows.length}</div>
                        <div className="mt-1 text-sm text-slate-600">
                            {branchTransferModal.mode === "send"
                                ? "Se marcarán como saliendo hacia la sucursal destino."
                                : "Se confirmará su llegada y el cliente podrá retirarlo."}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 p-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Costo total</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">Bs. {Number(branchTransferModal.totalDeliveryCost || 0).toFixed(2)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Costo por paquete</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">Bs. {branchTransferModal.rows.length > 0 ? (Number(branchTransferModal.totalDeliveryCost || 0) / branchTransferModal.rows.length).toFixed(2) : "0.00"}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Impacto</div>
                            <div className="mt-1 text-sm font-medium text-slate-700">Se registrará en <code className="rounded bg-slate-100 px-1 py-0.5">costo_delivery</code> y alimentará los reportes.</div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 text-sm font-medium text-neutral-700">Costo total del delivery</div>
                        <InputNumber
                            min={0}
                            precision={2}
                            prefix="Bs."
                            style={{ width: "100%" }}
                            value={branchTransferModal.totalDeliveryCost}
                            onChange={(value) =>
                                setBranchTransferModal((current) => ({
                                    ...current,
                                    totalDeliveryCost: Number(value || 0),
                                }))
                            }
                        />
                    </div>

                    <div>
                        <div className="mb-1 text-sm font-medium text-neutral-700">Método de pago</div>
                        <Radio.Group
                            value={branchTransferModal.paymentMethod}
                            onChange={(event) =>
                                setBranchTransferModal((current) => ({
                                    ...current,
                                    paymentMethod: event.target.value,
                                }))
                            }
                        >
                            <Radio.Button value="2">Efectivo</Radio.Button>
                            <Radio.Button value="1">Transferencia o QR</Radio.Button>
                        </Radio.Group>
                    </div>
                </div>
            </Modal>

            <ShippingInfoModal
                visible={isModalVisible && !isModaStatelVisible}
                shipping={selectedShipping}
                sucursals={sucursal} // <-- esta línea es clave
                onClose={() => setIsModalVisible(false)}
                onSave={() => {
                    setIsModalVisible(false);
                    fetchShippings();
                }}
                isAdmin={canManageExternal}

            />
            </div>

            <ShippingStateModal
                visible={isModaStatelVisible}
                order={selectedShipping}
                onClose={() => {
                    setIsModalStateVisible(false);
                    setIsModalVisible(false);
                }}
                onSave={() => {
                    setIsModalStateVisible(false);
                    fetchShippings();
                }}
                shipping={selectedShipping}
            />

            <ExternalPackagesFormModal
                visible={isExternalCreateVisible}
                currentSucursal={currentSucursal}
                onClose={() => setIsExternalCreateVisible(false)}
                onCreated={() => {
                    setIsExternalCreateVisible(false);
                    fetchShippings();
                }}
            />

            <ExternalShippingInfoModal
                visible={isExternalInfoVisible}
                externalShipping={selectedExternalShipping}
                isAdmin={canManageExternal}
                canSendGuideWhatsapp={isSuperadminUser(user)}
                onClose={() => {
                    setIsExternalInfoVisible(false);
                    setSelectedExternalShipping(null);
                }}
                onSaved={() => {
                    setIsExternalInfoVisible(false);
                    setSelectedExternalShipping(null);
                    fetchShippings();
                }}
            />
            <SimplePackageManagerModal
                visible={isSimplePackageManagerVisible}
                onClose={() => setIsSimplePackageManagerVisible(false)}
                onChanged={() => {
                    fetchShippings();
                }}
            />
        </div>
    );
};

export default ShippingTable;

