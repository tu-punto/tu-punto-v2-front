import { DatePicker, Input, message, Select, Table } from 'antd';
import { useContext, useEffect, useState, useMemo } from 'react';
import { getShippingsAPI, getShippingByIdAPI } from '../../api/shipping';
import ShippingInfoModal from './ShippingInfoModal';
import ShippingStateModal from './ShippingStateModal';
import { getSucursalsAPI } from '../../api/sucursal';
import { getSellersAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext.tsx";
import moment from "moment-timezone";

const { RangePicker } = DatePicker;
const { Option } = Select;

const ShippingTable = ({ refreshKey }: { refreshKey: number }) => {
    const { user }: any = useContext(UserContext);
    const [shippingData, setShippingData] = useState([]);
    const [esperaData, setEsperaData] = useState([]);
    const [entregadoData, setEntregadoData] = useState([]);
    const [filteredEsperaData, setFilteredEsperaData] = useState([]);
    const [filteredEntregadoData, setFilteredEntregadoData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState<'En Espera' | 'entregado'>('En Espera');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isModaStatelVisible, setIsModalStateVisible] = useState(false);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [otherLocation, setOtherLocation] = useState('');
    const [sucursal, setSucursal] = useState([] as any[]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [selectedVendedor, setSelectedVendedor] = useState("");
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isVendedor = user?.role?.toLowerCase() === 'vendedor';
    //console.log("Usuario:", user);
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
    const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);

    const [isMobile, setIsMobile] = useState(false);

    const fetchShippings = async () => {
        try {
            const apiData = await getShippingsAPI();
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()
            );
            const dataWithKey = sortedData.map((pedido: any) => ({
                ...pedido,
                key: pedido._id
            }));
            setShippingData(dataWithKey);
        } catch (error) {
            console.error("Error fetching shipping data:", error);
        }
    };
    const toSimpleDate = (d: Date | null) =>
        d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

    const getVendedoresConEntregas = () => {
        const vendedoresConEntregasSet = new Set();

        // Obtener vendedores de pedidos en espera
        esperaData.forEach((pedido: any) => {
            // Buscar en las ventas del pedido
            (pedido.venta || []).forEach((venta: any) => {
                if (venta.vendedor) {
                    // Si vendedor es un objeto, usar su _id; si es string, usarlo directamente
                    const vendedorId = typeof venta.vendedor === 'object'
                        ? venta.vendedor._id
                        : venta.vendedor;
                    vendedoresConEntregasSet.add(vendedorId);
                }
            });

            // Buscar en productos temporales si existen
            (pedido.productos_temporales || []).forEach((producto: any) => {
                if (producto.id_vendedor) {
                    vendedoresConEntregasSet.add(producto.id_vendedor);
                }
            });
        });

        // Obtener vendedores de pedidos entregados
        entregadoData.forEach((pedido: any) => {
            // Buscar en las ventas del pedido
            (pedido.venta || []).forEach((venta: any) => {
                if (venta.vendedor) {
                    // Si vendedor es un objeto, usar su _id; si es string, usarlo directamente
                    const vendedorId = typeof venta.vendedor === 'object'
                        ? venta.vendedor._id
                        : venta.vendedor;
                    vendedoresConEntregasSet.add(vendedorId);
                }
            });

            // Buscar en productos temporales si existen
            (pedido.productos_temporales || []).forEach((producto: any) => {
                if (producto.id_vendedor) {
                    vendedoresConEntregasSet.add(producto.id_vendedor);
                }
            });
        });

        // Filtrar vendedores que están en los datos de entregas
        const resultado = vendedores.filter(vendedor =>
            vendedoresConEntregasSet.has(vendedor._id)
        );

        return resultado;
    };

    const filterByLocationAndDate = (data: any) => {
        const nombreSucursalToIdMap = new Map(
            sucursal.map((suc) => [suc.nombre, suc._id?.toString()])
        );
        return data.filter((pedido: any) => {
            const isOtherLocation = selectedLocation === 'other';
            const matchesOrigin =
                !selectedOrigin ||
                pedido.lugar_origen?._id?.toString() === nombreSucursalToIdMap.get(selectedOrigin);

            const matchesLocation = isOtherLocation
                ? !sucursal.some((suc) => suc.nombre.toLowerCase() === pedido.lugar_entrega.toLowerCase()) &&
                (!otherLocation || pedido.lugar_entrega.toLowerCase().includes(otherLocation.toLowerCase()))
                : !selectedLocation || pedido.lugar_entrega.toLowerCase().includes(selectedLocation.toLowerCase());
            const matchesDateRange =
                dateRange[0] && dateRange[1]
                    ? toSimpleDate(new Date(pedido.hora_entrega_acordada)) >= toSimpleDate(dateRange[0]) &&
                    toSimpleDate(new Date(pedido.hora_entrega_acordada)) <= toSimpleDate(dateRange[1])
                    : true;
            // Lógica actualizada para el filtro de vendedor
            const matchesVendedor = isAdmin
                ? (selectedVendedor === "Todos" || !selectedVendedor || // Si es "Todos" o vacío, mostrar todos
                    pedido.venta?.some((v: any) => {
                        const vendedorId = typeof v.vendedor === 'object' ? v.vendedor._id : v.vendedor;
                        return vendedorId === selectedVendedor || v.id_vendedor === selectedVendedor;
                    }) ||
                    pedido.productos_temporales?.some((p: any) =>
                        p.id_vendedor === selectedVendedor
                    ))
                : (
                    pedido.venta?.some((v: any) => {
                        const vendedorId = typeof v.vendedor === 'object' ? v.vendedor._id : v.vendedor;
                        return v.id_vendedor === user?.id_vendedor || vendedorId === user?.id_vendedor;
                    }) ||
                    pedido.productos_temporales?.some((p: any) =>
                        p.id_vendedor === user?.id_vendedor
                    )
                );

            return matchesOrigin && matchesLocation && matchesDateRange && matchesVendedor;
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
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (_: any, record: any) => {
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
    ];

    // const handleCancel = () => {
    //     setIsModalExternalVisible(false)
    // };

    // const handleIconClick = (order: any) => {
    //     if (order.estado_pedido === "Entregado") return;
    //     setSelectedShipping(order);
    //     setIsModalStateVisible(true);
    // };

    // const handleRowClick = async (record: any) => {
    //     try {
    //         const shipping = await getShippingByIdAPI(record._id); // ✅ este endpoint debe devolver solo UN pedido
    //         console.log("📦 Pedido individual para el modal:", shipping);
    //         setSelectedShipping(shipping);
    //         setIsModalVisible(true);
    //     } catch (error) {
    //         console.error("Error al obtener pedido por ID:", error);
    //         message.error("Error al cargar el pedido");
    //     }
    // };
    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursal(response);

            if (isAdmin) {
                const sucursalId = localStorage.getItem("sucursalId");
                if (sucursalId) {
                    const sucursalActual = response.find((s: any) =>
                        s._id === sucursalId || s.id_sucursal === sucursalId
                    );
                    if (sucursalActual) {
                        setSelectedOrigin(sucursalActual.nombre);
                    }
                }
            } else {
                setSelectedOrigin('');
            }
        } catch (error) {
            message.error('Error al obtener las sucursales');
        }
    };

    useEffect(() => {
        fetchShippings();
        fetchSucursal();
    }, [refreshKey]);

    useEffect(() => {
        setEsperaData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En Espera'));
        setEntregadoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'Entregado'));
    }, [shippingData]);

    useEffect(() => {
        setFilteredEsperaData(filterByLocationAndDate(esperaData));
        setFilteredEntregadoData(filterByLocationAndDate(entregadoData));
    }, [esperaData, entregadoData, selectedLocation, selectedOrigin, dateRange, selectedVendedor]);
    useEffect(() => {
        const fetchVendedores = async () => {
            try {
                const response = await getSellersAPI();
                setVendedores(response);
            } catch (error) {
                message.error("Error al obtener vendedores");
            }
        };
        fetchVendedores();
    }, []);
    //console.log("Rol", user?.role?.toLowerCase());
    return (
        <div>
            <div className="flex justify-center flex-wrap gap-2 mb-4">
                {isAdmin && (
                    <Select
                        style={{ width: 200, margin: 8 }}
                        placeholder="Vendedores"
                        value={selectedVendedor || undefined}
                        onChange={(value) => setSelectedVendedor(value || "")}
                        allowClear
                    >
                        {getVendedoresConEntregas().map((vendedor: any) => (
                            <Option key={vendedor._id} value={vendedor._id}>
                                {vendedor.nombre} {vendedor.apellido}
                            </Option>
                        ))}
                    </Select>
                )}

                <Select
                    style={{ width: 200, margin: 8 }}
                    placeholder="Estado del pedido"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value)}
                >
                    <Option value="En Espera">En Espera</Option>
                    <Option value="entregado">Entregado</Option>
                </Select>
                <Select
                    placeholder="Sucursal de Origen"
                    style={{ width: 200, margin: 8 }}
                    value={selectedOrigin}
                    onChange={(value) => setSelectedOrigin(value || '')}
                    allowClear={!isAdmin}
                    disabled={isAdmin} // ← Bloquea si es admin
                >
                    {sucursal.map((suc: any) => (
                        <Option key={suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                <Select
                    style={{ width: 200, margin: 8 }}
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
                        <Option key={suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                {selectedLocation === 'other' && (
                    <Input
                        style={{ width: 200, marginBottom: 16 }}
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
                        style={{ width: 240, margin: 8 }}
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
            </div>

            {selectedStatus === 'En Espera' && (
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
            )}

            {selectedStatus === 'entregado' && (
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
            )}

            <ShippingInfoModal
                visible={isModalVisible && !isModaStatelVisible}
                shipping={selectedShipping}
                sucursals={sucursal} // <-- esta línea es clave
                onClose={() => setIsModalVisible(false)}
                onSave={() => {
                    setIsModalVisible(false);
                    fetchShippings();
                }}
                isAdmin={user?.role?.toLowerCase() === 'admin'}

            />

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
        </div>
    );
};

export default ShippingTable;
