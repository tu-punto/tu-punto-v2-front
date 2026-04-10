import { ArrowRightOutlined, InboxOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, DatePicker, Input, message, Select, Table, Tooltip } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { getShippingsListAPI, getShippingByIdAPI } from '../../api/shipping';
import { getExternalSaleByIdAPI, getExternalSalesListAPI } from '../../api/externalSale';
import ShippingInfoModal from './ShippingInfoModal';
import ShippingStateModal from './ShippingStateModal';
import ExternalPackagesFormModal from './ExternalPackagesFormModal';
import ExternalShippingInfoModal from './ExternalShippingInfoModal';
import SimplePackageManagerModal from './SimplePackageManagerModal';
import { getSucursalsBasicAPI } from '../../api/sucursal';
import { getSellersBasicAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext.tsx";
import moment from "moment-timezone";

const { RangePicker } = DatePicker;
const { Option } = Select;
const EXTERNAL_VENDOR_FILTER = "__EXTERNO__";
const VISUAL_IN_TRANSIT_THRESHOLD_MINUTES = 30;

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const resolveBranchId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value?._id || value?.id_sucursal || value?.$oid || "");
};

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

const getVisualStatusMeta = (pedido: any, now: moment.Moment) => {
    const estadoReal = String(pedido?.estado_pedido || "").trim();

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
    const [entregadoData, setEntregadoData] = useState([]);
    const [filteredEsperaData, setFilteredEsperaData] = useState([]);
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
    const [selectedOrigin, setSelectedOrigin] = useState('');
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

    const [isMobile, setIsMobile] = useState(false);
    const canManageExternal = isAdmin || isOperator;
    const currentSucursalId = localStorage.getItem("sucursalId") || "";
    const currentSucursal = sucursal.find((s: any) =>
        String(s._id) === String(currentSucursalId) ||
        String(s.id_sucursal) === String(currentSucursalId)
    );
    const inTransitCount = filteredEsperaData.filter((pedido: any) => getVisualStatusMeta(pedido, statusNow).isVisualOnly).length;

    const mapExternalToShipping = (externalSale: any) => {
        const estaPagado =
            externalSale?.esta_pagado === "mixto"
                ? "mixto"
                : (externalSale?.esta_pagado === "si" ? "si" : "no");
        const precioPaquete = Number(externalSale?.precio_paquete ?? externalSale?.precio_total ?? 0);
        const pagaComprador = Number(externalSale?.monto_paga_comprador ?? 0);
        const estadoPedido = externalSale?.estado_pedido || (externalSale?.delivered ? "Entregado" : "En Espera");
        const fechaBase = externalSale?.fecha_pedido || new Date().toISOString();
        const sucursalOrigen = typeof externalSale?.sucursal === "object" ? externalSale.sucursal : null;
        const sucursalNombre = sucursalOrigen?.nombre || externalSale?.lugar_entrega || "Externo";

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
            lugar_entrega: sucursalNombre,
            id_sucursal: sucursalOrigen?._id || externalSale?.sucursal || externalSale?.id_sucursal,
            sucursal: sucursalOrigen,
            estado_pedido: estadoPedido,
            esta_pagado: estaPagado,
            saldo_cobrar: Number(
                externalSale?.saldo_cobrar ?? (estaPagado === "si" ? 0 : estaPagado === "mixto" ? pagaComprador : precioPaquete)
            ),
            observaciones: externalSale?.descripcion_paquete || "",
            venta: [],
            productos_temporales: [],
        };
    };

    const filteredInTransitData = filteredEsperaData.filter((pedido: any) => getVisualStatusMeta(pedido, statusNow).isVisualOnly);
    const toggleStatus = () => {
        setSelectedStatus(prev => prev === 'entregado' ? 'En Espera' : 'entregado');
    };

    const fetchShippings = async () => {
        setLoadingTable(true);
        try {
            const from = dateRange[0] ? moment(dateRange[0]).startOf("day").toISOString() : undefined;
            const to = dateRange[1] ? moment(dateRange[1]).endOf("day").toISOString() : undefined;
            const status = selectedStatus === "entregado" ? "Entregado" : "En Espera";
            const selectedOriginId = sucursal.find((s: any) => s.nombre === selectedOrigin)?._id;
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
                    originId: selectedOriginId,
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
                        sucursalId: selectedOriginId
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
        const nombreSucursalToIdMap = new Map(
            sucursal.map((suc) => [suc.nombre, suc._id?.toString()])
        );
        return data.filter((pedido: any) => {
            const isOtherLocation = selectedLocation === 'other';
            const isExternal = !!pedido.is_external;
            const lugarEntregaLower = String(pedido.lugar_entrega || "").toLowerCase();
            const origenId = resolveBranchId(pedido.lugar_origen);
            const selectedOriginId = nombreSucursalToIdMap.get(selectedOrigin);
            const matchesOrigin = !selectedOrigin || origenId === selectedOriginId;

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
            ].some((value: any) => String(value || "").toLowerCase().includes(searchValue));

            return matchesOrigin && matchesLocation && matchesDateRange && matchesVendedor && matchesCliente;
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
    ];
    const visibleColumns = columns.filter((column: any) => column?.key !== 'lugar_origen');

    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsBasicAPI();
            setSucursal(Array.isArray(response) ? response : []);

            setSelectedOrigin('');
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
        selectedOrigin,
        selectedVendedor,
        searchCliente,
        user?.id_vendedor,
        sucursal.length
    ]);

    useEffect(() => {
        setEsperaData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En Espera'));
        setEntregadoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'Entregado'));
    }, [shippingData]);

    useEffect(() => {
        setFilteredEsperaData(filterByLocationAndDate(esperaData));
        setFilteredEntregadoData(filterByLocationAndDate(entregadoData));
    }, [esperaData, entregadoData, selectedLocation, selectedOrigin, dateRange, selectedVendedor, searchCliente]);
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
            <div className="mb-4 bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                {(isAdmin || isOperator) && (
                    <Select
                        style={{ width: 200, margin: 0 }}
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
                    style={{ width: 200, margin: 0 }}
                    placeholder="Buscar nombre, carnet o celular..."
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
                    placeholder="Sucursal de Origen"
                    style={{ width: 200, margin: 0 }}
                    value={selectedOrigin}
                    onChange={(value) => setSelectedOrigin(value || '')}
                    allowClear
                    disabled={isAdmin || isOperator} // ← Bloquea si es admin
                >
                    {sucursal.map((suc: any) => (
                        <Option key={suc._id || suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                <Select
                    style={{ width: 200, margin: 0 }}
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
                        style={{ width: 200, marginBottom: 0 }}
                        placeholder="Especificar otro lugar"
                        value={otherLocation}
                        onChange={(e) => setOtherLocation(e.target.value)}
                    />
                )}
                {isMobile ? (
                    <>
                        <DatePicker
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
                            type="primary"
                            icon={<span className="inline-flex items-center gap-0.5"><InboxOutlined /><ArrowRightOutlined /></span>}
                            onClick={() => setIsExternalCreateVisible(true)}
                            style={{ width: 46, height: 46, borderRadius: 10, fontSize: 18 }}
                        />
                    </Tooltip>
                )}
                {canManageExternal && (
                    <Tooltip title="Gestionar paquetes del servicio">
                        <Button
                            type="default"
                            icon={<InboxOutlined />}
                            onClick={() => setIsSimplePackageManagerVisible(true)}
                            style={{ height: 46, borderRadius: 10, fontWeight: 700 }}
                        >
                            Paquetes
                        </Button>
                    </Tooltip>
                )}
                {onOpenQR && (
                    <Tooltip title="Escanear QR de pedidos">
                        <Button
                            type="default"
                            icon={<QrcodeOutlined />}
                            onClick={onOpenQR}
                            style={{ width: 46, height: 46, borderRadius: 10, fontSize: 18 }}
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
            <Table
                loading={loadingTable}
                columns={visibleColumns}
                dataSource={
                    selectedStatus === 'entregado'
                        ? filteredEntregadoData
                        : selectedStatus === 'en_camino'
                            ? filteredInTransitData
                            : filteredEsperaData
                }
                pagination={{
                    pageSize: 30,
                    showSizeChanger: true,
                    pageSizeOptions: ["15", "30", "50", "100"]
                }}
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
            />
        </div>
    );
};

export default ShippingTable;

